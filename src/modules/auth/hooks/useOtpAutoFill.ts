import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useSMSRetriever } from "@ebrimasamba/react-native-sms-retriever";

import { extractOtpCode } from "../utils/otp";

interface UseOtpAutoFillOptions {
  codeLength?: number;
  onCodeReceived: (code: string) => void;
}

interface UseOtpAutoFillReturn {
  appHash: string;
  restartListening: () => Promise<void>;
  isReady: boolean;
  hasError: boolean;
}

export function useOtpAutoFill({
  codeLength = 6,
  onCodeReceived,
}: UseOtpAutoFillOptions): UseOtpAutoFillReturn {
  const onCodeReceivedRef = useRef(onCodeReceived);

  onCodeReceivedRef.current = onCodeReceived;

  const handleSuccess = useCallback(
    (receivedValue: string) => {
      const code = extractOtpCode(receivedValue);
      if (code?.length === codeLength) {
        onCodeReceivedRef.current(code);
      }
    },
    [codeLength],
  );

  const { appHash, reset, startListening, isReady, hasError } = useSMSRetriever(
    {
      onSuccess: handleSuccess,
    },
  );

  useEffect(() => {
    if (__DEV__ && Platform.OS === "android" && appHash) {
      console.info("[OTP] Android SMS Retriever app hash:", appHash);
    }
  }, [appHash]);

  const restartListening = useCallback(async () => {
    if (Platform.OS !== "android") return;

    reset();
    await startListening().catch(() => {
      // SMS Retriever is an optional enhancement; manual entry remains available.
    });
  }, [reset, startListening]);

  return { appHash, restartListening, isReady, hasError };
}
