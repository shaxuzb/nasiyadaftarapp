import { useMemo } from "react";
import { Platform } from "react-native";
import {
  resolveRegionalProductCapabilities,
  type RegionalProductCapabilities,
} from "../config/regionalCapabilities";

function getRuntimeLocaleAndTimeZone() {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return {
      locale: resolved.locale || null,
      timeZone: resolved.timeZone || null,
    };
  } catch {
    return { locale: null, timeZone: null };
  }
}

export function useRegionalProductCapabilities(): RegionalProductCapabilities {
  return useMemo(() => {
    const signals = getRuntimeLocaleAndTimeZone();
    return resolveRegionalProductCapabilities({
      platform: Platform.OS,
      locale: signals.locale,
      timeZone: signals.timeZone,
    });
  }, []);
}
