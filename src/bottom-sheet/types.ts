import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { ComponentType, ReactElement, ReactNode } from "react";
import { Transaction } from "../modules/transactions/types";
import type {
  OrganizationMembership,
  UpdateCurrentOrganizationRequest,
} from "../modules/organization/types";
import type {
  SmsPackage,
  SubscriptionPlan,
} from "../modules/subscription/types";
import type { PendingPaymentReference } from "../modules/payments/types";
import type { BlacklistedOrganization } from "../modules/clients/types";

export type SheetType =
  | "transaction"
  | "transactionDetail"
  | "language"
  | "organizationProfile"
  | "paymentCheckout"
  | "paymentStatus"
  | "paymentDetail"
  | "pendingPayments"
  | "telegramBots"
  | "legal"
  | "datePicker"
  | "blacklistOrganizations";

export interface TransactionSheetProps {
  customerId: number;
  type?: "debt" | "payment";
  customerName?: string;
  customerPhone?: string;
  /** Shows the blacklist warning even when the client list is not loaded. */
  isBlacklisted?: boolean;
  onOpenProfile?: () => void;
  currentBalance?: number;
}

export interface TransactionDetailSheetProps {
  transaction: Transaction;
  customerName: string;
}

export type LanguageSheetProps = Record<never, never>;

export type TelegramBotsSheetProps = Record<never, never>;

export type LegalSheetProps = Record<never, never>;

export interface BlacklistOrganizationsSheetProps {
  customerId: number;
  customerName: string;
  /** Pass when already known (the profile has them); otherwise the sheet loads them. */
  organizations?: BlacklistedOrganization[];
}

export interface DatePickerSheetProps {
  /** The currently chosen day, "YYYY-MM-DD". */
  value: string;
  /** The latest pickable day, "YYYY-MM-DD"; today when omitted. */
  maxDate?: string;
  title: string;
  onSelect: (value: string) => void;
}

export interface OrganizationProfileSheetProps {
  organization: OrganizationMembership;
  onSubmit: (payload: UpdateCurrentOrganizationRequest) => Promise<void>;
}

export type PaymentCheckoutSheetProps =
  | {
      productType: "subscription";
      plan: SubscriptionPlan;
    }
  | {
      productType: "sms_package";
      package: SmsPackage;
    };

export interface PaymentStatusSheetProps {
  orderId: number;
  /**
   * The user has just come back from the payment page: ask the server how the
   * payment went as soon as the sheet opens.
   */
  syncOnMount?: boolean;
}

export interface PaymentDetailSheetProps {
  orderId: number;
}

export interface PendingPaymentsSheetProps {
  payments: PendingPaymentReference[];
}

export interface SheetPropsMap {
  transaction: TransactionSheetProps;
  transactionDetail: TransactionDetailSheetProps;
  language: LanguageSheetProps;
  organizationProfile: OrganizationProfileSheetProps;
  paymentCheckout: PaymentCheckoutSheetProps;
  paymentStatus: PaymentStatusSheetProps;
  paymentDetail: PaymentDetailSheetProps;
  pendingPayments: PendingPaymentsSheetProps;
  telegramBots: TelegramBotsSheetProps;
  legal: LegalSheetProps;
  datePicker: DatePickerSheetProps;
  blacklistOrganizations: BlacklistOrganizationsSheetProps;
}

export interface SheetRenderProps<T extends SheetType> {
  closeSheet: (afterDismiss?: () => void) => void;
  setDismissLocked: (locked: boolean) => void;
  openSheet: BottomSheetContextValue["openSheet"];
  props: SheetPropsMap[T];
}

export interface SheetDefinition<T extends SheetType> {
  component: ComponentType<SheetRenderProps<T>>;
  snapPoints?: (string | number)[];
  provider?: ComponentType<SheetRenderProps<T> & { children: ReactNode }>;
  enableDynamicSizing?: boolean;
  enablePanDownToClose?: boolean;
  /** Keyboard dismissal is needed only for sheets that can open from text input flows. */
  dismissKeyboardOnOpen?: boolean;
  /**
   * What happens to a sheet already on screen when this one opens. gorhom's
   * default, "switch", slides the other sheet away until this one closes. A
   * sheet that edits one field of a form sheet beneath it uses "push" instead,
   * so the form stays where it is and this sheet opens on top of it.
   */
  stackBehavior?: "switch" | "push" | "replace";
}

export type SheetRegistry = {
  [K in SheetType]: SheetDefinition<K>;
};

export interface BackdropFactoryParams {
  closeSheet: (afterDismiss?: () => void) => void;
}

export interface BottomSheetContextValue {
  openSheet: <T extends SheetType>(type: T, props: SheetPropsMap[T]) => void;
  closeSheet: () => void;
  isOpen: boolean;
}

export interface ActiveSheetEntry<T extends SheetType = SheetType> {
  id: string;
  type: T;
  props: SheetPropsMap[T];
}

export type CreateBackdrop = (
  params: BackdropFactoryParams,
) => (props: BottomSheetBackdropProps) => ReactElement;
