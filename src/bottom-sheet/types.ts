import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { ComponentType, ReactElement } from "react";
import { Transaction } from "../modules/transactions/types";

export type SheetType = "transaction" | "transactionDetail";

export interface TransactionSheetProps {
  customerId: number;
  type?: "debt" | "payment";
  customerName?: string;
  currentBalance?: number;
}

export interface TransactionDetailSheetProps {
  transaction: Transaction;
  customerName: string;
}

export interface SheetPropsMap {
  transaction: TransactionSheetProps;
  transactionDetail: TransactionDetailSheetProps;
}

export interface SheetRenderProps<T extends SheetType> {
  closeSheet: () => void;
  props: SheetPropsMap[T];
}

export interface SheetDefinition<T extends SheetType> {
  component: ComponentType<SheetRenderProps<T>>;
  snapPoints: (string | number)[];
  enablePanDownToClose?: boolean;
}

export type SheetRegistry = {
  [K in SheetType]: SheetDefinition<K>;
};

export interface BackdropFactoryParams {
  closeSheet: () => void;
}

export interface BottomSheetContextValue {
  openSheet: <T extends SheetType>(
    type: T,
    props: SheetPropsMap[T],
  ) => void;
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
