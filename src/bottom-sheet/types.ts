import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { ComponentType, ReactElement, ReactNode } from "react";
import { Transaction } from "../modules/transactions/types";
import type {
  OrganizationMembership,
  UpdateCurrentOrganizationRequest,
} from "../modules/organization/types";

export type SheetType =
  | "transaction"
  | "transactionDetail"
  | "language"
  | "organizationProfile";

export interface TransactionSheetProps {
  customerId: number;
  type?: "debt" | "payment";
  customerName?: string;
  customerPhone?: string;
  onOpenProfile?: () => void;
  currentBalance?: number;
}

export interface TransactionDetailSheetProps {
  transaction: Transaction;
  customerName: string;
}

export type LanguageSheetProps = Record<never, never>;

export interface OrganizationProfileSheetProps {
  organization: OrganizationMembership;
  onSubmit: (payload: UpdateCurrentOrganizationRequest) => Promise<void>;
}

export interface SheetPropsMap {
  transaction: TransactionSheetProps;
  transactionDetail: TransactionDetailSheetProps;
  language: LanguageSheetProps;
  organizationProfile: OrganizationProfileSheetProps;
}

export interface SheetRenderProps<T extends SheetType> {
  closeSheet: (afterDismiss?: () => void) => void;
  setDismissLocked: (locked: boolean) => void;
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
