import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
} from "react-native-reanimated";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation, type TranslateKey } from "../../../i18n";
import { SetupChoiceStep, type SetupChoice } from "../components/SetupChoiceStep";
import { useAppSetup } from "../context/AppSetupContext";
import {
  filterByQuery,
  isCurrencyCode,
  SETUP_CURRENCIES,
  SETUP_LANGUAGES,
  type CurrencyCode,
} from "../data/setupOptions";

const STEP_COUNT = 2;
const TRANSITION_MS = 220;

/**
 * First launch, before signing in: the language, then the currency. The
 * language takes effect the moment it is tapped, so the rest of the setup
 * (and the app) is already in it.
 */
export function FirstLaunchSetup() {
  const theme = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const setup = useAppSetup();
  const [step, setStep] = useState<1 | 2>(1);
  // Which way the steps move, so going back slides the other way.
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [languageQuery, setLanguageQuery] = useState("");
  const [currencyQuery, setCurrencyQuery] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(setup.currency);
  const [finishing, setFinishing] = useState(false);

  const languageChoices = useMemo<SetupChoice[]>(() => {
    const languages = filterByQuery(
      SETUP_LANGUAGES,
      languageQuery,
      (language) =>
        `${language.nativeName} ${t(`setup.languageNames.${language.code}` as TranslateKey)} ${language.code}`,
    );
    return languages.map((language) => ({
      key: language.code,
      flag: language.flag,
      title: language.nativeName,
      subtitle: t(`setup.languageNames.${language.code}` as TranslateKey),
      disabled: language.locale === null,
    }));
  }, [languageQuery, t]);

  const currencyChoices = useMemo<SetupChoice[]>(() => {
    const currencies = filterByQuery(
      SETUP_CURRENCIES,
      currencyQuery,
      (item) => `${t(`setup.currencyNames.${item.code}` as TranslateKey)} ${item.code} ${item.symbol}`,
    );
    return currencies.map((item) => ({
      key: item.code,
      flag: item.flag,
      title: t(`setup.currencyNames.${item.code}` as TranslateKey),
      subtitle: item.code,
      trailing: item.symbol,
    }));
  }, [currencyQuery, t]);

  const selectLanguage = useCallback(
    (code: string) => {
      const language = SETUP_LANGUAGES.find((item) => item.code === code);
      if (language?.locale) setLocale(language.locale);
    },
    [setLocale],
  );
  const selectCurrency = useCallback((code: string) => {
    if (isCurrencyCode(code)) setCurrency(code);
  }, []);

  const goToCurrency = useCallback(() => {
    setDirection("forward");
    setStep(2);
  }, []);
  const backToLanguage = useCallback(() => {
    setDirection("back");
    setStep(1);
  }, []);
  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    await setup.completeSetup(currency);
  }, [currency, finishing, setup]);

  const entering = (direction === "forward" ? FadeInRight : FadeInLeft).duration(TRANSITION_MS);
  const exiting = (direction === "forward" ? FadeOutLeft : FadeOutRight).duration(TRANSITION_MS);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {step === 1 ? (
        <Animated.View key="language" style={styles.fill} entering={entering} exiting={exiting}>
          <SetupChoiceStep
            step={1}
            stepCount={STEP_COUNT}
            title={t("setup.languageTitle")}
            subtitle={t("setup.languageSubtitle")}
            searchPlaceholder={t("setup.languageSearch")}
            query={languageQuery}
            onQueryChange={setLanguageQuery}
            choices={languageChoices}
            selectedKey={locale}
            onSelect={selectLanguage}
            actionLabel={t("setup.continue")}
            onAction={goToCurrency}
          />
        </Animated.View>
      ) : (
        <Animated.View key="currency" style={styles.fill} entering={entering} exiting={exiting}>
          <SetupChoiceStep
            step={2}
            stepCount={STEP_COUNT}
            title={t("setup.currencyTitle")}
            subtitle={t("setup.currencySubtitle")}
            searchPlaceholder={t("setup.currencySearch")}
            query={currencyQuery}
            onQueryChange={setCurrencyQuery}
            choices={currencyChoices}
            selectedKey={currency}
            onSelect={selectCurrency}
            actionLabel={t("setup.start")}
            onAction={() => void finish()}
            actionLoading={finishing}
            onBack={backToLanguage}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  fill: { ...StyleSheet.absoluteFillObject },
});
