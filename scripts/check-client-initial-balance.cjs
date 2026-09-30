// A customer can be created with the balance they already carry.
//
// POST /api/clients takes two optional fields: initialBalance (positive = debt,
// negative = advance; 0 or absent records nothing) and initialBalanceDate
// ("YYYY-MM-DD", today when absent). The date matters more than it looks:
// blacklisting counts overdue days from it, so an old debt entered with today's
// date would silently escape the blacklist.
//
// This locks down the sign convention, the "no amount, no fields" rule, the
// date plumbing, the cache refresh the backend's extra transaction needs, and
// the calendar the date is picked from.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const previousLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

try {
  /* 1. The request shape: only creation may carry an initial balance. */

  const types = read("src/modules/clients/types/index.ts");
  assert.match(
    types,
    /interface ClientCreateRequest extends ClientUpdateRequest[\s\S]*initialBalance\?: number;[\s\S]*initialBalanceDate\?: string;/,
    "Creating a client must accept an initial balance and its date",
  );
  const updateBlock = types.slice(
    types.indexOf("export interface ClientUpdateRequest"),
    types.indexOf("export interface ClientCreateRequest"),
  );
  assert.doesNotMatch(
    updateBlock,
    /initialBalance/,
    "Editing a client must never send an initial balance; that would add a second opening transaction",
  );

  /* 2. The form: sign, empty amount, date. */

  const screen = read("src/screens/CustomersScreen.tsx");
  assert.match(
    screen,
    /initialBalance:\s*balanceDirection === "debt" \? balanceAmount : -balanceAmount/,
    "Debt must be sent positive and an advance negative",
  );
  assert.match(
    screen,
    /\.\.\.\(balanceAmount === null\s*\?\s*\{\}/,
    "An empty or zero amount must send neither field",
  );
  assert.match(
    screen,
    /initialBalanceDate: balanceDate \?\? todayDateOnly\(\)/,
    "The picked date must be sent, defaulting to today",
  );
  assert.match(
    screen,
    /useState<DateOnly \| null>\(null\)/,
    "The date must default to a live 'today', not one frozen when the screen mounted",
  );
  assert.match(
    screen,
    /const balanceAmountRef = useRef\(""\)/,
    "The amount must not live in state; it would re-render the customer list on every keystroke",
  );
  assert.match(
    screen,
    /openSheet\("datePicker", \{/,
    "The date must be picked from the calendar sheet",
  );
  assert.match(
    screen,
    /trailingAccessory=\{[\s\S]*?styles\.dateChip/,
    "The date must sit inside the amount field rather than as a field of its own",
  );

  /* 3. The backend writes the balance as a transaction, so those caches go stale. */

  const queries = read("src/modules/clients/hooks/useClientQueries.ts");
  assert.match(
    queries,
    /data\.initialBalance \? "transaction" : "created"/,
    "Creating a client with a balance must refresh transaction-derived data",
  );

  /* 4. Real behavior of the helpers the form relies on. */

  const { parseAmountInput } = require(path.join(root, "src/utils/amountInput.ts"));
  assert.equal(parseAmountInput("1 500 000"), 1500000);
  assert.equal(parseAmountInput(""), null, "Blank means no initial balance");
  assert.equal(parseAmountInput("0"), null, "Zero means no initial balance");

  const { createTranslator } = require(path.join(root, "src/i18n/translate.ts"));
  const { formatDateOnly, formatRelativeDateOnly } = require(
    path.join(root, "src/i18n/calendarLabels.ts"),
  );
  const uz = createTranslator("uz");
  const ru = createTranslator("ru");
  assert.equal(formatRelativeDateOnly("2026-03-12", "2026-03-12", uz), "Bugun");
  assert.equal(formatRelativeDateOnly("2026-03-11", "2026-03-12", uz), "Kecha");
  assert.equal(formatRelativeDateOnly("2026-01-05", "2026-03-12", uz), "5 yan 2026");
  assert.equal(formatDateOnly("2026-05-09", ru), "9 мая 2026");
  assert.equal(formatDateOnly("not-a-date", uz), "", "A bad value must not render as a date");

  /* 5. The calendar sheet. */

  const sheet = read("src/bottom-sheet/sheets/DatePickerSheet.tsx");
  assert.match(
    sheet,
    /disabled=\{cell !== null && cell\.date > maxDate\}/,
    "Days after the maximum date must not be selectable",
  );
  assert.match(
    sheet,
    /paddingBottom: Math\.max\(insets\.bottom, 12\)/,
    "The calendar must clear the Android bottom inset",
  );
  assert.match(
    sheet,
    /const DayCell = memo\(/,
    "Day cells must be memoized so paging the month re-renders only what changed",
  );
  assert.doesNotMatch(
    read("src/i18n/calendarLabels.ts"),
    /Intl\.DateTimeFormat/,
    "Month names must come from translations; Hermes can lack uz-UZ month data",
  );

  const registry = read("src/bottom-sheet/registry.ts");
  assert.match(registry, /datePicker: \{\s*component: DatePickerSheet/);

  // gorhom's default "switch" slides the sheet beneath out of view, which made
  // the add-customer form vanish the moment the calendar opened.
  const datePickerEntry = registry.slice(registry.indexOf("datePicker: {"));
  assert.match(
    datePickerEntry.slice(0, datePickerEntry.indexOf("},")),
    /stackBehavior: "push"/,
    "The calendar must open on top of the form sheet, not replace it on screen",
  );
  assert.match(
    read("src/bottom-sheet/BottomSheetProvider.tsx"),
    /stackBehavior=\{activeDefinition\.stackBehavior \?\? "switch"\}/,
    "The provider must apply each sheet's stack behavior",
  );

  console.log("Client initial balance, date plumbing and calendar contract passed");
} finally {
  if (previousLoader) {
    require.extensions[".ts"] = previousLoader;
  } else {
    delete require.extensions[".ts"];
  }
}
