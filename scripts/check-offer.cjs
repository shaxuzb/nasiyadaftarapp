// The public offer.
//
//   GET  /offer          is there an offer
//   GET  /offer/status   where the signed-in user stands; mustAccept = true
//                        puts a sheet in front of the app that cannot be closed
//   POST /offer/accept   { version } -> the new status; 409 means the offer
//                        changed and the status has to be fetched again
//
// enabled = false: nothing is shown anywhere.
//
// The link to the offer is always the one built into the app
// (https://qarzdaftar.rbsx.uz/terms-of-service). The `url` in the API's
// answers is never used.
//
// `requiredForOrganization` is not used either. On the first organization the
// agreement is always asked for and always required; on a further one it is
// required wherever the checkbox is shown.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const read = (file) => fs.readFileSync(file, "utf8");

function load(file, dependencies = {}) {
  const code = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      require: (name) => {
        if (name in dependencies) return dependencies[name];
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
    { filename: file },
  );
  return exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

async function main() {
  /* ---------- The three requests ---------- */

  const calls = [];
  const statusBody = {
    enabled: true,
    version: "v2",
    title: "Ommaviy oferta",
    url: "https://qarzdaftar.rbsx.uz/terms-of-service",
    accepted: true,
    acceptedAt: "2026-10-08T09:00:00Z",
    mustAccept: false,
  };
  let acceptBody = statusBody;
  const apiClient = {
    get: async (url, config) => {
      calls.push({ method: "get", url, config });
      if (url === "/offer") {
        return {
          data: {
            enabled: true,
            version: "v2",
            title: "Ommaviy oferta",
            url: "https://qarzdaftar.rbsx.uz/terms-of-service",
            requiredForOrganization: true,
          },
        };
      }
      return { data: { ...statusBody, accepted: false, acceptedAt: null, mustAccept: true } };
    },
    post: async (url, body) => {
      calls.push({ method: "post", url, body });
      return { data: acceptBody };
    },
  };
  const offerUtils = load("src/modules/offer/utils/offer.ts");
  const service = load("src/modules/offer/services/offerService.ts", {
    "../../../services/axiosService": { apiClient },
    "../utils/offer": offerUtils,
  });

  const controller = new AbortController();
  const info = plain(await service.getOffer(controller.signal));
  assert.equal(info.enabled, true);
  assert.equal("requiredForOrganization" in info, false);
  assert.equal("url" in info, false, "The server's link is not carried into the app");
  assert.equal(calls[0].url, "/offer");
  assert.equal(calls[0].config.signal, controller.signal);

  const status = plain(await service.getOfferStatus());
  assert.equal(status.mustAccept, true);
  assert.equal("url" in status, false);
  assert.equal(calls[1].url, "/offer/status");

  const next = plain(await service.acceptOffer("v2"));
  assert.equal(next.mustAccept, false);
  assert.equal(next.accepted, true);
  assert.equal(calls[2].method, "post");
  assert.equal(calls[2].url, "/offer/accept");
  assert.deepEqual(plain(calls[2].body), { version: "v2" }, "The version shown is the version accepted");

  // An answer that cannot be read is not a failure to accept: the caller asks
  // for the status instead.
  acceptBody = "ok";
  assert.equal(await service.acceptOffer("v2"), null);
  acceptBody = statusBody;
  await service.acceptOffer(null);
  assert.deepEqual(plain(calls.at(-1).body), {}, "No version to send: none is invented");

  assert.doesNotMatch(read("src/modules/offer/services/offerService.ts"), /\/api\/offer/);

  /* ---------- One link, the app's own ---------- */

  assert.match(
    read("src/config/legalLinks.ts"),
    /TERMS_OF_SERVICE_URL = "https:\/\/qarzdaftar\.rbsx\.uz\/terms-of-service";/,
  );
  for (const file of [
    "src/modules/offer/utils/offer.ts",
    "src/modules/offer/hooks/useOffer.ts",
    "src/modules/offer/components/OfferAcceptanceGate.tsx",
    "src/modules/offer/components/OfferAcceptanceModal.tsx",
    "src/modules/organization/components/OrganizationCreateSheetContent.tsx",
    "src/screens/OrganizationSetupScreen.tsx",
    "src/screens/OrganizationSelectScreen.tsx",
  ]) {
    assert.doesNotMatch(
      read(file),
      /\.url\b|offerUrl|\burl: (?:string|readHttpsUrl|info|status)/,
      file + " must not take the offer's link from the API",
    );
  }
  assert.match(
    read("src/modules/offer/components/OfferAcceptanceGate.tsx"),
    /openExternalLink\(TERMS_OF_SERVICE_URL\)/,
  );

  /* ---------- The gate: who is asked, and when ---------- */

  const gate = read("src/modules/offer/components/OfferAcceptanceGate.tsx");
  assert.match(
    gate,
    /const inOrganization =\s*userId !== null && organizationId !== null && !isBootstrapping;/,
    "Only a signed-in user working in an organization is asked",
  );
  assert.match(gate, /useOfferStatus\(organizationId \?\? "none", inOrganization\)/);
  assert.match(
    gate,
    /const visible =\s*inOrganization &&\s*!isResolving &&\s*!isLocked &&\s*!setupRequired &&\s*status\?\.mustAccept === true;/,
    "Shown only when the server says so, and never over the PIN screen",
  );
  assert.match(
    gate,
    /const next = await acceptOffer\(status\.version\);\s*if \(next\) \{\s*queryClient\.setQueryData\(\s*queryKeys\.offerStatus\(userId, organizationId\),\s*next,\s*\);\s*\} else \{\s*await refetch\(\);/,
    "The answer to accepting is the new status",
  );
  assert.match(
    gate,
    /if \(getApiErrorStatus\(acceptError\) === 409\) \{[\s\S]{0,260}setNotice\(getApiErrorUserMessage\(acceptError\) \?\? t\("offer\.updated"\)\);\s*await refetch\(\);/,
    "409: the offer changed; fetch the new one and say so",
  );
  assert.match(gate, /if \(acceptingRef\.current \|\| !status \|\| userId === null\) return;/, "One accept at a time");
  assert.match(
    gate,
    /if \(Date\.now\(\) - dataUpdatedAtRef\.current < RECHECK_AFTER_MS\) return;\s*void refetch\(\);/,
    "Asked again on the way back to the app, but not on every return",
  );
  assert.match(read("App.tsx"), /<AppNavigator \/>\s*<OfferAcceptanceGate \/>/);

  /* ---------- The modal: cannot be dismissed ---------- */

  const modal = read("src/modules/offer/components/OfferAcceptanceModal.tsx");
  assert.match(modal, /const ignoreClose = \(\) => undefined;/);
  assert.match(modal, /onRequestClose=\{ignoreClose\}/, "Android back does not close it");
  assert.doesNotMatch(
    modal,
    /onDismiss|onClose|name="close"|closeLabel/,
    "No close button and no way to dismiss",
  );
  assert.match(modal, /<View style=\{styles\.overlay\}>/, "The backdrop is not pressable");
  assert.match(modal, /label=\{t\("offer\.accept"\)\}\s*onPress=\{onAccept\}\s*loading=\{accepting\}\s*disabled=\{busy\}/);
  assert.match(modal, /accessibilityRole="link"\s*accessibilityLabel=\{t\("offer\.read"\)\}\s*onPress=\{onRead\}/);
  // Someone who does not agree can still sign out, but not by one stray tap:
  // the same question the profile asks comes first.
  assert.match(
    modal,
    /const accepted = await confirm\(\{\s*title: t\("profile\.logoutTitle"\),\s*message: t\("profile\.logoutMessage"\),\s*confirmText: t\("profile\.logout"\),\s*cancelText: t\("common\.cancel"\),\s*variant: "danger",\s*\}\);\s*if \(accepted\) onLogout\(\);/,
  );
  assert.doesNotMatch(modal, /onPress=\{onLogout\}/, "Signing out is never one tap away");
  assert.match(
    modal,
    /<Modal[\s\S]{0,200}onRequestClose=\{ignoreClose\}\s*>[\s\S]{0,420}<ConfirmDialogProvider>\s*<OfferAcceptanceCard \{\.\.\.card\} \/>\s*<\/ConfirmDialogProvider>\s*<\/Modal>/,
    "The question is presented from inside this modal, so it shows above it",
  );
  const settings = read("src/screens/SettingsScreen.tsx");
  for (const key of ["profile.logoutTitle", "profile.logoutMessage", "profile.logout", "common.cancel"]) {
    assert.ok(settings.includes('t("' + key + '")'), "same wording as the profile: " + key);
  }
  assert.match(
    gate,
    /await logout\(\);\s*showToast\(t\("profile\.logoutSuccess"\), "success"\);\s*\} catch \(logoutError\) \{\s*setError\(getLocalizedApiErrorMessage\(logoutError, "profile\.logoutError", t\)\);/,
  );
  assert.doesNotMatch(modal, /useToast|showToast/, "A toast would be drawn underneath the modal");
  assert.match(modal, /maxWidth: 440/);

  /* ---------- Creating an organization ---------- */

  const hooks = read("src/modules/offer/hooks/useOffer.ts");
  assert.match(
    hooks,
    /useOfferStatus\(\s*"organization-form",\s*enabled && checkAccepted && info\?\.enabled === true,\s*\)/,
    "The user's status is looked up only where they may have accepted before, and only if there is an offer",
  );
  const select = read("src/screens/OrganizationSelectScreen.tsx");
  assert.match(
    select,
    /useOrganizationOffer\(\{\s*checkAccepted: true,\s*enabled: isCreateSheetOpen,\s*\}\)/,
    "Nothing is fetched until the form is opened",
  );
  const sheet = read("src/modules/organization/components/OrganizationCreateSheetContent.tsx");
  assert.match(sheet, /\{offerConsent\.visible \? \(/);
  assert.match(
    sheet,
    /\.\.\.\(isOfferAcceptedForOrganization\(offerConsent, offerAccepted\)\s*\? \{ offerAccepted: true as const \}\s*: \{\}\),/,
  );
  assert.match(sheet, /disabled=\{saving \|\| waitingForOffer\}/);
  assert.match(
    sheet,
    /const waitingForOffer =\s*offerLoading \|\| \(offerConsent\.visible && !offerAccepted\);/,
    "Shown means required",
  );
  for (const file of fs
    .readdirSync("src", { recursive: true })
    .map((name) => "src/" + String(name).replace(/\\/g, "/"))
    .filter((name) => /\.tsx?$/.test(name) && !name.endsWith(".test.ts"))) {
    const text = read(file);
    if (!text.includes("requiredForOrganization")) continue;
    assert.equal(
      file,
      "src/modules/offer/utils/offer.ts",
      file + " must not act on requiredForOrganization",
    );
    assert.doesNotMatch(text, /item\.requiredForOrganization|\.requiredForOrganization\b/);
  }

  /* ---------- Wording ---------- */

  for (const file of ["uz.ts", "ru.ts"]) {
    const translations = read(`src/i18n/translations/${file}`);
    const section = translations.slice(translations.indexOf("\n  offer: {"));
    assert.ok(section.length > 0, `${file} has the offer wording`);
    for (const key of ["title", "description", "read", "accept", "acceptError", "updated"]) {
      assert.match(section.slice(0, 700), new RegExp(`\\b${key}:`), `${file}: offer.${key}`);
    }
  }

  console.log("Public offer: requests, mandatory acceptance and organization consent passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
