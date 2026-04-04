export type TransactionType = 'debt' | 'payment';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  note?: string;
  createdAt?: string;
}

export interface Transaction {
  id: number;
  customerId: number;
  type: TransactionType;
  amount: number;
  date: string;
  note?: string;
}

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

export interface DashboardStats {
  totalDebt: number;
  totalPaid: number;
  remainingBalance: number;
  activeDebtorsCount: number;
  totalCustomers: number;
}

export type RootStackParamList = {
  MainTabs: undefined;
  CustomerDetail: { customerId: number };
  AddCustomer: undefined;
  AddTransaction: { customerId: number; type?: TransactionType };
};

export type MainTabParamList = {
  Customers: undefined;
  Reports: undefined;
  Settings: undefined;
};
