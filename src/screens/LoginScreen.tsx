import React from "react";

import { PhoneAuthScreen } from "./PhoneAuthScreen";

interface Props {
  onGoToVerify: (params: {
    phoneNumber: string;
    maskedPhone: string;
    expiresInSeconds: number;
  }) => void;
}

export function LoginScreen({ onGoToVerify }: Props) {
  return (
    <PhoneAuthScreen
      onGoToVerify={onGoToVerify}
    />
  );
}
