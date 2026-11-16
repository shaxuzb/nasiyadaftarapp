// Adding a customer is a round button at the bottom right of the customers
// list, where the thumb is, as adding a debt is on the customer's page. It is
// not in the header any more, and the list leaves room for it.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const screen = fs.readFileSync("src/screens/CustomersScreen.tsx", "utf8");

assert.match(
  screen,
  /<Pressable\s+accessibilityRole="button"\s+accessibilityLabel=\{t\("customers\.addCustomer"\)\}\s+onPress=\{openAddCustomerSheet\}[\s\S]{0,400}?<Ionicons name="person-add" size=\{30\} color="#FFFFFF"/,
);
assert.match(screen, /addFab: \{\s*position: "absolute",\s*right: 16,\s*bottom: 16,\s*width: 62,\s*height: 62,/, "A person with a plus, a size bigger");
assert.doesNotMatch(screen, /styles\.addBtn|addBtn: \{/, "Not in the header any more");
assert.match(screen, /paddingBottom: 96,/, "The last card scrolls clear of the button");
// Inside the screen's own column (tab screens are framed), not the window.
const fab = screen.indexOf("styles.addFab");
assert.ok(
  fab > screen.search(/<FlatList\s/) && fab < screen.search(/<BottomSheetModal\s+ref=/),
  "Beside the list, inside the screen",
);
// The empty list still offers its own big button.
assert.match(screen, /<PrimaryButton\s+label=\{t\("customers\.addAction"\)\}\s+onPress=\{openAddCustomerSheet\}/);

console.log("Customers: the add button is at the bottom right");

// On a dark page a dark shadow cannot be seen: both floating buttons glow in
// their own colour there, with a light ring, from one shared style.
const elevation = fs.readFileSync("src/theme/floatingAction.ts", "utf8");
assert.match(elevation, /return dark\s*\?\s*\{\s*shadowColor: theme\.primary,/);
assert.match(elevation, /borderColor: "rgba\(255, 255, 255, 0\.18\)",/);
for (const file of ["src/screens/CustomersScreen.tsx", "src/screens/CustomerDetailScreen.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /floatingActionElevation\(theme, resolvedScheme === "dark"\)/, `${file}: the shared elevation`);
  assert.match(source, /, fabElevation,|\n\s*fabElevation,/, `${file}: applied to its button`);
}
console.log("Floating buttons: visible on light and dark pages");
