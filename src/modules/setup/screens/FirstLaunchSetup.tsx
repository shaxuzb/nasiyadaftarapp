import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation, type TranslateKey } from "../../../i18n";
import { detectDeviceLocale } from "../../../i18n/deviceLocale";
import { readStoredLocalePreference } from "../../../i18n/i18nStorage";
import { SetupChoiceStep, type SetupChoice } from "../components/SetupChoiceStep";
import { useAppSetup } from "../context/AppSetupContext";
import { filterByQuery, SETUP_LANGUAGES } from "../data/setupOptions";

/**
 * First launch, before signing in: the language, nothing else. It takes
 * effect the moment it is tapped, so the app is already in it. The currency
 * belongs to an organization and is chosen once one is created
 * (OrganizationCurrencySetupGate).
 */
export function FirstLaunchSetup() {
  const theme = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const setup = useAppSetup();
  const [languageQuery, setLanguageQuery] = useState("");
  const [finishing, setFinishing] = useState(false);

  // A fresh install opens in the phone's language, when the app has it;
  // the user still sees the list and can pick another. A language chosen
  // before (on this phone) is kept.
  useEffect(() => {
    let active = true;
    void readStoredLocalePreference().then((stored) => {
      if (!active || stored) return;
      const detected = detectDeviceLocale();
      if (detected) setLocale(detected);
    });
    return () => {
      active = false;
    };
    // Once, on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const selectLanguage = useCallback(
    (code: string) => {
      const language = SETUP_LANGUAGES.find((item) => item.code === code);
      if (language?.locale) setLocale(language.locale);
    },
    [setLocale],
  );

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    await setup.completeSetup();
  }, [finishing, setup]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SetupChoiceStep
        step={1}
        stepCount={1}
        title={t("setup.languageTitle")}
        subtitle={t("setup.languageSubtitle")}
        searchPlaceholder={t("setup.languageSearch")}
        query={languageQuery}
        onQueryChange={setLanguageQuery}
        choices={languageChoices}
        selectedKey={locale}
        onSelect={selectLanguage}
        actionLabel={t("setup.start")}
        onAction={() => void finish()}
        actionLoading={finishing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
