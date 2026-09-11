export type SubscriptionUpgradeReason =
  "sms-limit" | "telegram" | "organization-limit" | "blacklist";

interface SubscriptionSnapshot {
  planCode?: string | null;
}

export type SubscriptionUpgradeIcon =
  "sms" | "telegram" | "blacklist" | "organization";

export interface SubscriptionUpgradeOptions {
  title: string;
  description: string;
  icon: SubscriptionUpgradeIcon;
  steps: readonly string[];
  showQuota: boolean;
  showPro: boolean;
  showPackages: boolean;
}

export function getSubscriptionUpgradeOptions(
  subscription: SubscriptionSnapshot | null | undefined,
  reason: SubscriptionUpgradeReason,
): SubscriptionUpgradeOptions {
  const isPro = subscription?.planCode?.toUpperCase() === "PRO";

  if (reason === "telegram") {
    return {
      title: "Telegram bot PRO tarifida",
      description: "Kundalik mijozlar qarzi hisobotini Telegram orqali oling.",
      icon: "telegram",
      steps: [
        "Telefon raqamingiz bilan ulang",
        "Tashkilotni tanlang",
        "Kundalik Excel hisobot oling",
      ],
      showQuota: false,
      showPro: !isPro,
      showPackages: false,
    };
  }

  if (reason === "organization-limit") {
    return {
      title: "Tashkilot limiti tugadi",
      description:
        "Yana tashkilot yaratish uchun cheksiz tashkilotlar beradigan PRO tarifiga o'ting.",
      icon: "organization",
      steps: ["Barcha do'konlaringizni bitta akkauntda boshqaring"],
      showQuota: false,
      showPro: !isPro,
      showPackages: false,
    };
  }

  if (reason === "blacklist") {
    return {
      title: "Qora ro'yxat PRO tarifida",
      description: "Muddati o'tgan qarzdorlarni avtomatik aniqlang.",
      icon: "blacklist",
      steps: [
        "Muddatni tashkilot bo'yicha sozlash",
        "Qarzdorlarni avtomatik belgilash",
        "Boshqa do'konlardagi holatini ko'rish",
      ],
      showQuota: false,
      showPro: !isPro,
      showPackages: false,
    };
  }

  return {
    title: "SMS limitingiz tugadi",
    description: isPro
      ? "SMS yuborishni davom ettirish uchun mos variantni tanlang."
      : "Bu oy uchun bepul SMS limitingiz tugadi.",
    icon: "sms",
    steps: [],
    showQuota: true,
    showPro: !isPro,
    showPackages: true,
  };
}
