export type PaymentProductType = "subscription" | "sms_package";

export type PaymentStatus =
  | "pending"
  | "holding"
  | "paid"
  | "cancelled"
  | "failed"
  | "expired"
  | "refunded";

export interface PaymentLinks {
  payme: string | null;
}

export interface PaymentOrder {
  id: number;
  productType: PaymentProductType;
  providerTransactionId: string | null;
  paymentServiceTransactionId: number | null;
  reversedDate: string | null;
  productId: number;
  productCode: string;
  productName: string;
  amount: number;
  amountTiyin: number;
  currency: string;
  status: PaymentStatus;
  remoteStatus: string | null;
  externalId: string | null;
  invoiceId: string | null;
  accountNumber: string | null;
  provider: string | null;
  paymentUrl: string | null;
  paymentLinks: PaymentLinks;
  createdDate: string;
  updatedDate: string | null;
  paidDate: string | null;
  fulfilledDate: string | null;
  isFulfilled: boolean;
  /** How many months a subscription order buys; null for anything else. */
  periodMonths: number | null;
}

export interface PaymentCheckoutAttempt {
  version: 1;
  userId: number;
  productType: PaymentProductType;
  productId: number;
  /** The provider this attempt was made with; absent when none was chosen. */
  provider?: string;
  /**
   * What else makes this a different request: the term ("m3") and whether it
   * renews the current plan ("renew:m3"). Absent for a plain one-off order.
   */
  variant?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface PendingPaymentReference {
  version: 1;
  userId: number;
  orderId: number;
  productType: PaymentProductType;
  productId: number;
  openedExternally: boolean;
  updatedAt: string;
}
