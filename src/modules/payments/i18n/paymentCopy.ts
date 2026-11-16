import type { Locale } from "../../../i18n/types";
import type { TranslationSchema } from "../../../i18n/types";
import { uzPaymentCopy } from "./locales/uz";
import { ruPaymentCopy } from "./locales/ru";
import { enPaymentCopy } from "./locales/en";
import { kkPaymentCopy } from "./locales/kk";
import { tgPaymentCopy } from "./locales/tg";
import { kyPaymentCopy } from "./locales/ky";
import { trPaymentCopy } from "./locales/tr";
import { tkPaymentCopy } from "./locales/tk";

/** The payment flow's words: every language has all of them (the Uzbek shape). */
export type PaymentCopy = TranslationSchema<typeof uzPaymentCopy>;

export const PAYMENT_COPY: Record<Locale, PaymentCopy> = {
  uz: uzPaymentCopy,
  ru: ruPaymentCopy,
  en: enPaymentCopy,
  kk: kkPaymentCopy,
  tg: tgPaymentCopy,
  ky: kyPaymentCopy,
  tr: trPaymentCopy,
  tk: tkPaymentCopy,
};

export function getPaymentCopy(locale: Locale): PaymentCopy {
  return PAYMENT_COPY[locale] ?? PAYMENT_COPY.uz;
}
