export type PaymentProductType = "subscription" | "sms_package";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "failed"
  | "expired";

export interface PaymentLinks {
  payme: string | null;
}

export interface PaymentOrder {
  id: number;
  productType: PaymentProductType;
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
}

export interface PaymentCheckoutAttempt {
  version: 1;
  userId: number;
  productType: PaymentProductType;
  productId: number;
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
