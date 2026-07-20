import { SheetRegistry } from "./types";
import { TransactionSheet } from "./sheets/TransactionSheet";

export const sheetRegistry: SheetRegistry = {
  transaction: {
    component: TransactionSheet,
    snapPoints: ["88%"],
    enablePanDownToClose: true,
  },
};
