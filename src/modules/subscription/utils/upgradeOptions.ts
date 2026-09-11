export type SubscriptionUpgradeReason =
  "sms-limit" | "telegram" | "organization-limit" | "blacklist";

export type PaidPlanCode = "STANDARD" | "PREMIUM";

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
  showPlans: boolean;
  showPackages: boolean;
  recommendedPlanCode: PaidPlanCode;
}

export function normalizePlanCode(planCode?: string | null) {
  return planCode?.trim().toUpperCase() ?? "FREE";
}

export function isPaidPlanCode(planCode?: string | null) {
  const normalized = normalizePlanCode(planCode);
  return normalized === "STANDARD" || normalized === "PREMIUM";
}

export function getSubscriptionUpgradeOptions(
  subscription: SubscriptionSnapshot | null | undefined,
  reason: SubscriptionUpgradeReason,
): SubscriptionUpgradeOptions {
  const currentPlanCode = normalizePlanCode(subscription?.planCode);
  const isPremium = currentPlanCode === "PREMIUM";
  const recommendedPlanCode: PaidPlanCode = "PREMIUM";

  if (reason === "telegram") {
    return {
      title: "Telegram bot pullik tarifda",
      description: "Kundalik mijozlar qarzi hisobotini Telegram orqali oling.",
      icon: "telegram",
      steps: [
        "Telefon raqamingiz bilan ulang",
        "Tashkilotni tanlang",
        "Kundalik Excel hisobot oling",
      ],
      showQuota: false,
      showPlans: !isPremium && currentPlanCode !== "STANDARD",
      showPackages: false,
      recommendedPlanCode,
    };
  }

  if (reason === "organization-limit") {
    return {
      title: "Tashkilot limiti tugadi",
      description:
        "Yana tashkilot yaratish uchun Standard yoki Premium tarifini tanlang.",
      icon: "organization",
      steps: ["Barcha do'konlaringizni bitta akkauntda boshqaring"],
      showQuota: false,
      showPlans: !isPremium && currentPlanCode !== "STANDARD",
      showPackages: false,
      recommendedPlanCode,
    };
  }

  if (reason === "blacklist") {
    return {
      title: "Qora ro'yxat pullik tarifda",
      description: "Muddati o'tgan qarzdorlarni avtomatik aniqlang.",
      icon: "blacklist",
      steps: [
        "Muddatni tashkilot bo'yicha sozlash",
        "Qarzdorlarni avtomatik belgilash",
        "Boshqa do'konlardagi holatini ko'rish",
      ],
      showQuota: false,
      showPlans: !isPremium && currentPlanCode !== "STANDARD",
      showPackages: false,
      recommendedPlanCode,
    };
  }

  return {
    title: "SMS limitingiz tugadi",
    description: isPremium
      ? "SMS yuborishni davom ettirish uchun mos variantni tanlang."
      : "Bu oy uchun bepul SMS limitingiz tugadi.",
    icon: "sms",
    steps: [],
    showQuota: true,
    showPlans: !isPremium,
    showPackages: true,
    recommendedPlanCode,
  };
}
