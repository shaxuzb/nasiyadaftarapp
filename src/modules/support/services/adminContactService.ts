import { Linking } from "react-native";

export const ADMIN_TELEGRAM_USERNAME = "@richdev_1";

const ADMIN_TELEGRAM_URL = "https://t.me/richdev_1";

export async function openAdminTelegram(): Promise<void> {
  const supported = await Linking.canOpenURL(ADMIN_TELEGRAM_URL);
  if (!supported) {
    throw new Error("Administrator bilan aloqa havolasini ochib bo'lmadi");
  }

  await Linking.openURL(ADMIN_TELEGRAM_URL);
}
