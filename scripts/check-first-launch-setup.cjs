// First launch, before signing in: choose the language (it applies at once),
// then the currency, on one familiar page with a search. Languages without a
// translation are listed as coming soon. Someone already signed in from
// before is never sent through it.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const navigation = read("src/navigation/index.tsx");
const flow = read("src/modules/setup/screens/FirstLaunchSetup.tsx");
const step = read("src/modules/setup/components/SetupChoiceStep.tsx");
const context = read("src/modules/setup/context/AppSetupContext.tsx");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

/* Where it sits. */

assert.match(read("App.tsx"), /<AppSetupProvider>[\s\S]*<AppNavigator \/>[\s\S]*<\/AppSetupProvider>/);
assert.match(navigation, /\|\| !appSetup\.ready\) \{/, "Nothing is decided before the stored setup is read");
assert.match(navigation, /if \(!user && !appSetup\.completed\) \{\s*return <FirstLaunchSetup \/>;/);
assert.match(
  navigation,
  /if \(userId !== null && appSetup\.ready && !appSetup\.completed\) void markCompleted\(\);/,
  "Signed in from before: done without asking",
);

/* The steps. */

assert.match(flow, /if \(language\?\.locale\) setLocale\(language\.locale\);/, "The language applies the moment it is tapped");
assert.match(flow, /disabled: language\.locale === null,/, "Untranslated languages are listed, not choosable");
assert.match(flow, /selectedKey=\{locale\}/);
assert.match(flow, /await setup\.completeSetup\(currency\);/);
assert.match(flow, /onBack=\{backToLanguage\}/);
assert.match(flow, /entering=\{entering\} exiting=\{exiting\}/, "The steps slide, the way they are going");

/* The page. */

assert.match(step, /<SearchBar value=\{query\} onChangeText=\{onQueryChange\}/);
assert.match(step, /accessibilityRole="radio"/);
assert.match(step, /\{choice\.disabled \? \(\s*<View style=\{styles\.soonBadge\}>/, "Coming soon in place of the radio");
assert.match(step, /disabled=\{!selectedKey\}/);
assert.match(step, /column: \{ flex: 1, width: "100%", maxWidth: 560,/, "A centred column on a tablet");
assert.match(step, /const ChoiceRow = memo\(/);
assert.match(context, /const STORAGE_KEY = "app_setup_v1";/);

/* The same languages, with their flags, in the profile's language sheet; the
   profile row and the sign-in button show the flag of the one in use. */

const languageSheet = read("src/bottom-sheet/sheets/LanguageSheet.tsx");
assert.match(languageSheet, /\{SETUP_LANGUAGES\.map\(\(language\) => \{/);
assert.match(languageSheet, /<Text style=\{styles\.flag\}>\{flagOf\(language\.flag\)\}<\/Text>/);
assert.match(languageSheet, /disabled=\{!available\}/);
assert.match(languageSheet, /\{!available \? \(\s*<View style=\{styles\.soonBadge\}>/);
const settings = read("src/screens/SettingsScreen.tsx");
assert.match(settings, /const currentLanguage = getSetupLanguage\(locale\);/);
assert.match(settings, /leading=\{\s*<Text style=\{styles\.languageFlag\}>\{flagOf\(currentLanguage\.flag\)\}<\/Text>\s*\}/);
assert.match(settings, /\{leading \?\? <Ionicons name=\{icon\}/);
assert.match(read("src/components/LanguageSelectorButton.tsx"), /flagOf\(getSetupLanguage\(locale\)\.flag\)/);

/* Wording. */

for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  const section = source.slice(source.indexOf("\n  setup: {"));
  for (const key of ["languageTitle", "languageSubtitle", "currencyTitle", "currencySubtitle", "comingSoon", "continue", "start"]) {
    assert.match(section, new RegExp("\\n    " + key + ': "'), `${name}: setup.${key}`);
  }
  for (const code of ["uz", "ru", "en", "kk", "tg", "ky", "tr", "tk"]) {
    assert.match(section, new RegExp("\\n      " + code + ': "'), `${name}: setup.languageNames.${code}`);
  }
  for (const code of ["UZS", "USD", "EUR", "RUB", "KZT", "KGS", "TJS", "TRY", "AED", "CNY"]) {
    assert.match(section, new RegExp("\\n      " + code + ': "'), `${name}: setup.currencyNames.${code}`);
  }
}

console.log("First launch: language then currency, before signing in");
