import { NativeModules, Platform } from "react-native";

import { matchSupportedLocale } from "./localeMatch";
import type { Locale } from "./types";

/**
 * The phone's language, when the app is translated into it: what first
 * launch selects before the user chooses. Read from Intl and, as a second
 * opinion, from the platform's own settings; never throws.
 */
export function detectDeviceLocale(): Locale | null {
  const tags: (string | undefined)[] = [];
  try {
    tags.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // No Intl data: the platform's settings below.
  }
  try {
    if (Platform.OS === "ios") {
      const settings = NativeModules.SettingsManager?.settings as
        | { AppleLanguages?: string[]; AppleLocale?: string }
        | undefined;
      tags.push(...(settings?.AppleLanguages ?? []), settings?.AppleLocale);
    } else {
      tags.push(NativeModules.I18nManager?.localeIdentifier as string | undefined);
    }
  } catch {
    // Nothing more to go on.
  }
  return matchSupportedLocale(tags);
}
