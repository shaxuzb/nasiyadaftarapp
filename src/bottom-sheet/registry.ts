import { SheetRegistry } from "./types";
import { TransactionSheet } from "./sheets/TransactionSheet";
import { TransactionDetailSheet } from "./sheets/TransactionDetailSheet";

export const sheetRegistry: SheetRegistry = {
  transaction: {
    component: TransactionSheet,
    snapPoints: ["88%", "100%"],
    enablePanDownToClose: true,
  },
  transactionDetail: {
    component: TransactionDetailSheet,
    snapPoints: ["88%"],
    enablePanDownToClose: true,
  },
};
