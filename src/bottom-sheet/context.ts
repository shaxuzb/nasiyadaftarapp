import { createContext } from "react";
import { BottomSheetContextValue } from "./types";

export const BottomSheetContext =
  createContext<BottomSheetContextValue | undefined>(undefined);

/** Whether a sheet is open; apart, so only the few who ask re-render. */
export const BottomSheetOpenContext = createContext(false);

