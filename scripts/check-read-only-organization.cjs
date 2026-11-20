// A shop past the plan's limit is "faqat ko'rish" (isReadOnly on the shop):
// everything shows, nothing is written. Every way to write must be closed, the
// user told why on the main screens, and the way out (Premium) offered to the
// owner only. Same for owner and staff.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

const organizationsApi = read("src/services/organizationsApi.ts");
assert.match(
  organizationsApi,
  /isReadOnly: typeof item\.isReadOnly === "boolean" \? item\.isReadOnly : undefined,/,
  "The shop list must carry isReadOnly, and say nothing when the answer does not",
);
// A refresh must not lose it: taken from GET /organizations when the list lacks it,
// and otherwise kept from what was known before.
assert.match(organizationsApi, /apiClient\.get<unknown>\("\/organizations"\)/);
assert.match(read("src/context/AuthContext.tsx"), /availableOrganizations = keepKnownAccess\(/);
assert.match(
  read("src/modules/organization/hooks/useOrganizationAccess.ts"),
  /const readOnly = currentOrganization\?\.isReadOnly === true;/,
);

/* Customers: no add button, a tap opens the customer instead of the debt sheet. */
const customers = read("src/screens/CustomersScreen.tsx");
assert.match(customers, /if \(readOnly\) \{\s*navigation\.navigate\("CustomerDetail"/);
assert.match(customers, /\{readOnly \? null : \(\s*<Pressable\s*accessibilityRole="button"\s*accessibilityLabel=\{t\("customers\.addCustomer"\)\}/);
assert.match(customers, /<ReadOnlyBanner \/>/);

/* Customer page: no debt/payment, no edit, no delete. */
const detail = read("src/screens/CustomerDetailScreen.tsx");
assert.match(detail, /if \(!customer \|\| deleting \|\| readOnly\) return;/);
assert.match(detail, /\.\.\.\(readOnly\s*\? \[\]/, "Edit is left out");
assert.match(detail, /isOwner && !readOnly/, "Delete is left out");
assert.match(detail, /\{readOnly \? null : \(\s*<Pressable\s*accessibilityRole="button"\s*accessibilityLabel=\{t\("transactions\.addTransaction"\)\}/);

/* SMS: nothing is sent; the due list offers no reminder. */
assert.match(read("src/screens/ClientSmsScreen.tsx"), /readOnly\s*\? \{ \.\.\.permitted, canSendOne: false, canSendBulk: false \}/);
assert.match(read("src/screens/DueClientsScreen.tsx"), /const canRemind = !readOnly &&/);

/* Settings: the shop's settings go, buying Premium stays (it is the way out). */
const settings = read("src/screens/SettingsScreen.tsx");
assert.match(settings, /const isOwner = isShopOwner && !readOnly;/);
assert.match(settings, /const showSubscriptionUi =\s*isShopOwner &&/);

/* The banner: Premium for the owner only. */
const banner = read("src/modules/organization/components/ReadOnlyBanner.tsx");
assert.match(banner, /if \(!readOnly\) return null;/);
assert.match(banner, /const canOpenPlans =\s*isOwner &&/);

console.log("Read-only organization: writes closed, banner and the way out passed");
