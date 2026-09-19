export function getOtpAutofillConfig(platform: "ios" | "android") {
  if (platform === "ios") {
    return {
      textContentType: "oneTimeCode" as const,
      autoComplete: "sms-otp" as const,
    };
  }

  return {
    autoComplete: "sms-otp" as const,
    importantForAutofill: "yes" as const,
  };
}
