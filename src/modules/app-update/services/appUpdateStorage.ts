import AsyncStorage from "@react-native-async-storage/async-storage";

import { DISMISSED_UPDATE_VERSION_KEY } from "../constants/appUpdate.constants";

export async function getDismissedUpdateVersion(): Promise<string | null> {
  return AsyncStorage.getItem(DISMISSED_UPDATE_VERSION_KEY);
}

export async function setDismissedUpdateVersion(
  version: string,
): Promise<void> {
  await AsyncStorage.setItem(DISMISSED_UPDATE_VERSION_KEY, version);
}
