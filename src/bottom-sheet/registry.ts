import { SheetRegistry } from "./types";
import {
  TransactionSheet,
  TransactionSheetProvider,
} from "./sheets/TransactionSheet";
import { TransactionDetailSheet } from "./sheets/TransactionDetailSheet";

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
};
