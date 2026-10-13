import * as Application from "expo-application";
import Constants from "expo-constants";

/**
 * Which build this is, read once from the installed binary. An over-the-air
 * update changes the JavaScript but not these, which is what the backend
 * wants: it gates features on what the installed app can do.
 */
export const APP_VERSION: string | null =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;

/** iOS build number or Android version code. */
export const APP_BUILD: string | null = Application.nativeBuildVersion ?? null;

export const APP_PLATFORM: "android" | "ios" | null =
  process.env.EXPO_OS === "android" || process.env.EXPO_OS === "ios"
    ? process.env.EXPO_OS
    : null;
