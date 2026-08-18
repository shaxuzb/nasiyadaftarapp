import React, { ReactNode } from "react";

import { useAppUpdate } from "../hooks/useAppUpdate";
import { AppUpdateBottomSheet } from "./AppUpdateBottomSheet";

export function AppUpdateGate({ children }: { children: ReactNode }) {
  const { availableUpdate, isOpeningStore, dismissUpdate, openStore } =
    useAppUpdate();

  return (
    <>
      {children}
      {availableUpdate ? (
        <AppUpdateBottomSheet
          key={`${availableUpdate.platform}-${availableUpdate.config.latestVersion}`}
          update={availableUpdate}
          isOpeningStore={isOpeningStore}
          onUpdate={() => {
            void openStore();
          }}
          onDismiss={dismissUpdate}
        />
      ) : null}
    </>
  );
}
