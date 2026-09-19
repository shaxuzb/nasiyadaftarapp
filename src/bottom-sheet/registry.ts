import { SheetRegistry } from "./types";
import {
  TransactionSheet,
  TransactionSheetProvider,
} from "./sheets/TransactionSheet";
import { TransactionDetailSheet } from "./sheets/TransactionDetailSheet";
import { LanguageSheet } from "./sheets/LanguageSheet";
import { PasswordChangeSheet } from "./sheets/PasswordChangeSheet";
import { OrganizationProfileSheet } from "./sheets/OrganizationProfileSheet";
import { SubscriptionCancellationSheet } from "./sheets/SubscriptionCancellationSheet";
import { PaymentCheckoutSheet } from "./sheets/PaymentCheckoutSheet";
import { PaymentStatusSheet } from "./sheets/PaymentStatusSheet";
import { PaymentDetailSheet } from "./sheets/PaymentDetailSheet";
import { PendingPaymentsSheet } from "./sheets/PendingPaymentsSheet";

export const sheetRegistry: SheetRegistry = {
  transaction: {
    component: TransactionSheet,
    provider: TransactionSheetProvider,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
  },
  transactionDetail: {
    component: TransactionDetailSheet,
    snapPoints: ["88%"],
    enablePanDownToClose: true,
  },
  language: {
    component: LanguageSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
    dismissKeyboardOnOpen: false,
  },
  passwordChange: {
    component: PasswordChangeSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
  },
  organizationProfile: {
    component: OrganizationProfileSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
    dismissKeyboardOnOpen: false,
  },
  subscriptionCancellation: {
    component: SubscriptionCancellationSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
  },
  paymentCheckout: {
    component: PaymentCheckoutSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
  },
  paymentStatus: {
    component: PaymentStatusSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
  },
  paymentDetail: {
    component: PaymentDetailSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
  },
  pendingPayments: {
    component: PendingPaymentsSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
  },
};
