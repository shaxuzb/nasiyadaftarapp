import type { Locale } from "../../i18n/types";

type NetworkCopy = {
  offline: string;
  internetRequired: string;
};

const NETWORK_COPY: Record<Locale, NetworkCopy> = {
  uz: {
    offline: "Internet aloqasi yo‘q",
    internetRequired: "Bu amal uchun internet aloqasi kerak",
  },
  ru: {
    offline: "Нет подключения к интернету",
    internetRequired: "Для этого действия требуется интернет",
  },
};

export function getNetworkCopy(locale: Locale): NetworkCopy {
  return NETWORK_COPY[locale];
}
