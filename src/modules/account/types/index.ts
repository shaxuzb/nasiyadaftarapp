export type PasswordDelivery = "SMS" | "EMAIL";

export interface PasswordChangeConfirmRequest {
  delivery: PasswordDelivery;
  code: string;
  newPassword: string;
}

export interface PhoneChangeConfirmRequest {
  phoneNumber: string;
  code: string;
}

export interface GoogleChangeConfirmRequest {
  idToken: string;
  code: string;
}
