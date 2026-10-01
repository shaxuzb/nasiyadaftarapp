export function getOtpAutofillConfig(platform: "ios" | "android") {
  if (platform === "ios") {
    // iOS reads only textContentType. React Native 0.83 does not forward
    // autoComplete to the native view on iOS at all, so "sms-otp" here was
    // dropped silently; it stays out so the config says what actually applies.
    //
    // Whether the QuickType bar offers the code is decided by iOS reading the
    // SMS, not by this input: the text needs a keyword iOS recognizes, such as
    // "code", next to the digits.
    return {
      textContentType: "oneTimeCode" as const,
    };
  }

  return {
    autoComplete: "sms-otp" as const,
    importantForAutofill: "yes" as const,
  };
}
