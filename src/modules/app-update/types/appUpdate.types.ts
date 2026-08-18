export type AppUpdatePlatform = "android" | "ios";

export interface PlatformUpdateConfig {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  title: string;
  message: string;
  storeUrl: string;
}

export interface AppVersionConfig {
  android: PlatformUpdateConfig;
  ios: PlatformUpdateConfig;
}

export interface AvailableAppUpdate {
  platform: AppUpdatePlatform;
  currentVersion: string;
  config: PlatformUpdateConfig;
  isForced: boolean;
}

export interface AppUpdateController {
  availableUpdate: AvailableAppUpdate | null;
  isChecking: boolean;
  isOpeningStore: boolean;
  dismissUpdate: () => void;
  openStore: () => Promise<void>;
  checkForUpdate: (ignoreThrottle?: boolean) => Promise<void>;
}
