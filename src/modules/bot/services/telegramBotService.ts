import { Linking } from "react-native";

export const TELEGRAM_BOT_URL = "https://t.me/qarz_daftar_rbsx_bot";

export async function openTelegramBot(): Promise<void> {
  const supported = await Linking.canOpenURL(TELEGRAM_BOT_URL);
  if (!supported) {
    throw new Error("Telegram bot havolasini ochib bo'lmadi");
  }
  await Linking.openURL(TELEGRAM_BOT_URL);
}
