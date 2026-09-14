const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

const api = read("src/services/organizationsApi.ts");
const types = read("src/modules/organization/types/index.ts");
const hook = read("src/modules/organization/hooks/useOrganizationProfileUpdate.ts");
const sheet = read("src/bottom-sheet/sheets/OrganizationProfileSheet.tsx");
const sheetTypes = read("src/bottom-sheet/types.ts");
const registry = read("src/bottom-sheet/registry.ts");
const settings = read("src/screens/SettingsScreen.tsx");

assert.match(types, /interface UpdateCurrentOrganizationRequest/);
assert.match(types, /name:\s*string/);
assert.match(types, /address:\s*string/);
assert.match(api, /apiClient\.put\("\/organizations\/current", payload\)/);
assert.match(hook, /await updateCurrentOrganization\(normalized\.value\)/);
assert.match(hook, /await getCurrentOrganization\(\)/);
assert.match(hook, /await refreshOrganizations\(\)/);
assert.doesNotMatch(hook, /updateUserProfile/);
assert.match(sheetTypes, /"organizationProfile"/);
assert.match(registry, /organizationProfile:/);
assert.match(sheet, /props\.onSubmit/);
assert.match(settings, /openSheet\("organizationProfile"/);
assert.match(settings, /handleOrganizationSwitch/);
assert.match(settings, /organization\.selectTitle/);

console.log("Organization profile update contract passed");
