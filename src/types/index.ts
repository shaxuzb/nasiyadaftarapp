export type { Transaction, TransactionType } from '../modules/transactions/types';
export type { Customer } from '../modules/clients/types';

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
};

export type MainTabParamList = {
  Customers: undefined;
  Reports: undefined;
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
    phoneMasked: string;
    expiresInSeconds: number;
  };
  PasswordResetRequest: undefined;
  PasswordResetConfirm: { phone: string };
};

export type OrganizationStackParamList = {
  OrganizationSetup: undefined;
  OrganizationSelect: undefined;
};
