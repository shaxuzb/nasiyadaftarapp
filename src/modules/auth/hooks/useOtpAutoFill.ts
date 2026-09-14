import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  addCodeListener,
  addConsentCancelledListener,
  addErrorListener,
  isAvailable,
  startListening,
  stopListening,
} from "../smsUserConsent";
import { extractOtpCode } from "../utils/otp";

interface UseOtpAutoFillOptions {
  codeLength?: number;
  onCodeReceived: (code: string) => void;
  autoStart?: boolean;
}

interface UseOtpAutoFillReturn {
  restartListening: () => Promise<void>;
  isReady: boolean;
  hasError: boolean;
}

export function useOtpAutoFill({
  codeLength = 6,
  onCodeReceived,
  autoStart = true,
}: UseOtpAutoFillOptions): UseOtpAutoFillReturn {
  const onCodeReceivedRef = useRef(onCodeReceived);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const [hasError, setHasError] = useState(
    Platform.OS === "android" && !isAvailable,
  );

  onCodeReceivedRef.current = onCodeReceived;

  const handleCodeReceived = useCallback(
    ({ code: receivedValue }: { code: string }) => {
      const code = extractOtpCode(receivedValue);
      if (code?.length === codeLength) {
        onCodeReceivedRef.current(code);
      }
    },
    [codeLength],
  );

  useEffect(() => {
    if (Platform.OS !== "android" || !isAvailable) return;

    const codeSubscription = addCodeListener(handleCodeReceived);
    const errorSubscription = addErrorListener(() => setHasError(true));
    const cancelledSubscription = addConsentCancelledListener(() => {
      setHasError(false);
    });

    return () => {
      codeSubscription?.remove();
      errorSubscription?.remove();
      cancelledSubscription?.remove();
    };
  }, [handleCodeReceived]);

  const armListener = useCallback(() => {
    if (Platform.OS !== "android" || !isAvailable) {
      return Promise.resolve();
    }
    if (startPromiseRef.current) return startPromiseRef.current;

    setHasError(false);
    const promise = startListening()
      .catch((error) => {
        setHasError(true);
        throw error;
      })
      .finally(() => {
        startPromiseRef.current = null;
      });
    startPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    if (!autoStart || Platform.OS !== "android" || !isAvailable) return;

    void armListener().catch(() => {
      // SMS User Consent is optional; manual OTP entry remains available.
    });

    return () => {
      stopListening();
      startPromiseRef.current = null;
    };
  }, [armListener, autoStart]);

  const restartListening = useCallback(async () => {
    if (Platform.OS !== "android" || !isAvailable) return;

    if (startPromiseRef.current) {
      await startPromiseRef.current.catch(() => {
        // A failed attempt is retried below.
      });
    }

    setHasError(false);
    stopListening();
    startPromiseRef.current = null;
    await armListener().catch(() => {
      // SMS User Consent is an optional enhancement; manual entry remains available.
      setHasError(true);
    });
  }, [armListener]);

  return {
    restartListening,
    isReady: Platform.OS !== "android" || isAvailable,
    hasError,
  };
}
