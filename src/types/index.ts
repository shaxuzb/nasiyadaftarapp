export type {
  Transaction,
  TransactionType,
} from "../modules/transactions/types";
export type { Customer } from "../modules/clients/types";

export interface AppTheme {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBackground: string;
  debtColor: string;
  debtBg: string;
  paymentColor: string;
  paymentBg: string;
  dangerColor: string;
  warningColor: string;
  successColor: string;
  cardShadow: string;
  tabBar: string;
  tabBarBorder: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  CustomerDetail: { customerId: number };
  AccountSecurity: undefined;
  PinChange: undefined;
  ClientSms: undefined;
  ClientSmsHistory: undefined;
  BlacklistSettings: undefined;
  Subscription: undefined;
  PaymentHistory: undefined;
};

export type MainTabParamList = {
  Customers: undefined;
  Reports: undefined;
  ClientSms: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RegisterSmsVerify: {
    registerPayload: {
      userName: string;
      password: string;
      fullName: string;
      phoneNumber: string;
    };
  };
  PasswordResetRequest: undefined;
  PasswordResetConfirm: { phone: string };
};

export type OrganizationStackParamList = {
  OrganizationSetup: undefined;
  OrganizationSelect: undefined;
  Subscription: undefined;
};
