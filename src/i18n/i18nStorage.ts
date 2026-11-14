import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  Locale,
} from "./types";
import { isSupportedLocale } from "./translate";

export async function readStoredLocale(): Promise<Locale> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
  } catch (error) {
    if (__DEV__) {
      console.warn("Language preference could not be loaded", error);
    }
    return DEFAULT_LOCALE;
  }
}

/** The language the user chose, if they ever did; null on a fresh install. */
export async function readStoredLocalePreference(): Promise<Locale | null> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export async function writeStoredLocale(locale: Locale): Promise<void> {
  if (!isSupportedLocale(locale)) return;

  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch (error) {
    if (__DEV__) {
      console.warn("Language preference could not be saved", error);
    }
  }
}
