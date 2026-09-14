package com.rbsx.smsuserconsent

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val MODULE_NAME = "SmsUserConsent"
private const val CONSENT_REQUEST_CODE = 2407
private const val EVENT_CODE_RECEIVED = "onCodeReceived"
private const val EVENT_CONSENT_CANCELLED = "onConsentCancelled"
private const val EVENT_ERROR = "onError"

class SmsUserConsentModule : Module() {
  private var receiverRegistered = false
  private var listening = false

  private val smsReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return

      val status = getStatus(intent.extras)
      if (status == null) {
        emitError("INVALID_STATUS", "SMS holati aniqlanmadi")
        cleanup()
        return
      }

      when (status.statusCode) {
        CommonStatusCodes.SUCCESS -> launchConsent(intent)
        CommonStatusCodes.TIMEOUT -> {
          emitError("TIMEOUT", "SMS kutish vaqti tugadi")
          cleanup()
        }
        else -> {
          emitError("RETRIEVER_ERROR", "SMS xizmatida xatolik yuz berdi")
          cleanup()
        }
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name(MODULE_NAME)
    Events(EVENT_CODE_RECEIVED, EVENT_CONSENT_CANCELLED, EVENT_ERROR)

    AsyncFunction("startListening") { promise: Promise ->
      startListening(promise)
    }

    Function("stopListening") {
      cleanup()
    }

    OnActivityResult { _, (requestCode, resultCode, data) ->
      if (requestCode == CONSENT_REQUEST_CODE) {
        handleConsentResult(resultCode, data)
      }
    }

    OnDestroy {
      cleanup()
    }
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext) {
      "React application context is unavailable"
    }

  private fun startListening(promise: Promise) {
    if (listening) {
      promise.resolve(null)
      return
    }

    cleanup()

    try {
      SmsRetriever.getClient(context)
        .startSmsUserConsent(null)
        .addOnSuccessListener {
          if (registerReceiver()) {
            listening = true
            promise.resolve(null)
          } else {
            promise.reject(
              "RECEIVER_ERROR",
              "SMS listenerni ishga tushirib bo'lmadi",
              null,
            )
          }
        }
        .addOnFailureListener { error ->
          promise.reject(
            "START_ERROR",
            error.message ?: "SMS listenerni ishga tushirib bo'lmadi",
            error,
          )
        }
    } catch (error: Exception) {
      promise.reject(
        "START_ERROR",
        error.message ?: "SMS listenerni ishga tushirib bo'lmadi",
        error,
      )
    }
  }

  private fun registerReceiver(): Boolean {
    if (receiverRegistered) return true

    return try {
      val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(
          smsReceiver,
          filter,
          SmsRetriever.SEND_PERMISSION,
          null,
          Context.RECEIVER_EXPORTED,
        )
      } else {
        @Suppress("DEPRECATION")
        context.registerReceiver(
          smsReceiver,
          filter,
          SmsRetriever.SEND_PERMISSION,
          null,
        )
      }
      receiverRegistered = true
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun launchConsent(intent: Intent) {
    val consentIntent = getConsentIntent(intent)
    val activity = appContext.currentActivity

    if (consentIntent == null) {
      emitError("CONSENT_INTENT_MISSING", "SMS ruxsat oynasini ochib bo'lmadi")
      cleanup()
      return
    }

    if (activity == null) {
      emitError("ACTIVITY_UNAVAILABLE", "Ilova oynasi mavjud emas")
      cleanup()
      return
    }

    try {
      activity.startActivityForResult(consentIntent, CONSENT_REQUEST_CODE)
    } catch (_: Exception) {
      emitError("CONSENT_LAUNCH_FAILED", "SMS ruxsat oynasini ochib bo'lmadi")
      cleanup()
    }
  }

  private fun handleConsentResult(resultCode: Int, data: Intent?) {
    if (resultCode != Activity.RESULT_OK) {
      sendEvent(EVENT_CONSENT_CANCELLED, Bundle())
      cleanup()
      return
    }

    val message = getSmsMessage(data)
    val code = message?.let(::extractOtpCode)

    if (code.isNullOrBlank()) {
      emitError("INVALID_SMS_FORMAT", "SMS ichidan tasdiqlash kodi topilmadi")
      cleanup()
      return
    }

    sendEvent(
      EVENT_CODE_RECEIVED,
      Bundle().apply { putString("code", code) },
    )
    cleanup()
  }

  private fun extractOtpCode(message: String): String? =
    Regex("(?<!\\d)\\d{6}(?!\\d)").find(message)?.value

  private fun emitError(code: String, message: String) {
    sendEvent(
      EVENT_ERROR,
      Bundle().apply {
        putString("code", code)
        putString("message", message)
      },
    )
  }

  private fun cleanup() {
    listening = false

    if (!receiverRegistered) return

    try {
      context.unregisterReceiver(smsReceiver)
    } catch (_: IllegalArgumentException) {
      // Receiver was already removed by the Android lifecycle.
    } finally {
      receiverRegistered = false
    }
  }

  @Suppress("DEPRECATION")
  private fun getStatus(extras: Bundle?): Status? =
    extras?.getParcelable(SmsRetriever.EXTRA_STATUS)

  @Suppress("DEPRECATION")
  private fun getConsentIntent(intent: Intent): Intent? =
    intent.extras?.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT)

  @Suppress("DEPRECATION")
  private fun getSmsMessage(data: Intent?): String? =
    data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
}
