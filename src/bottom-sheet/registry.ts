import { SheetRegistry } from "./types";
import {
  TransactionSheet,
  TransactionSheetProvider,
} from "./sheets/TransactionSheet";
import { TransactionDetailSheet } from "./sheets/TransactionDetailSheet";
import { LanguageSheet } from "./sheets/LanguageSheet";
import { OrganizationProfileSheet } from "./sheets/OrganizationProfileSheet";

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
  organizationProfile: {
    component: OrganizationProfileSheet,
    enableDynamicSizing: true,
    enablePanDownToClose: true,
    dismissKeyboardOnOpen: false,
  },
};
