// Each client can receive at most one SMS a day.
//
// GET /clients/sms-recipients now marks those clients with smsSentToday and
// sets canSend to false; a single send to one returns 400 with a reason; a bulk
// send reports them as status "skipped" with an errorMessage. This locks down
// how the app reads, shows and survives all three, and that a send cannot be
// fired twice while the first is still in flight.

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
  /* 1. The flag is read from the API. */

  const { parseSmsRecipients } = require(
    path.join(root, "src/modules/client-sms/utils/smsParsing.ts"),
  );
  const page = parseSmsRecipients({
    count: 2,
    results: [
      { id: 1, fullName: "Ali", phoneNumber: "+998901112233", canSend: false, smsSentToday: true },
      { id: 2, fullName: "Vali", phoneNumber: "+998901112244", canSend: true },
    ],
  });
  assert.equal(page.results[0].smsSentToday, true, "smsSentToday must be read");
  assert.equal(page.results[0].canSend, false);
  assert.equal(
    page.results[1].smsSentToday,
    false,
    "A missing flag must read as not sent, so older backends keep working",
  );
  assert.equal(
    parseSmsRecipients({ results: [{ id: 3, isSmsSentToday: true }] }).results[0]
      .smsSentToday,
    true,
    "The flag must also be read under its isSmsSentToday spelling",
  );

  /* 2. The row says "sent today" where the reason goes, not "can't send". */

  const row = read("src/modules/client-sms/components/SmsRecipientRow.tsx");
  // With the queue an SMS "today" may still be waiting, so the line says one
  // exists rather than that it went. A known cooldown date says more and comes
  // first; a status chip already on the row makes the line redundant.
  assert.match(
    row,
    /: recipient\.nextSmsAvailableDate\s*\?[\s\S]*?sms\.nextAvailable"[\s\S]*?: recipient\.smsSentToday && !recipient\.lastSmsStatus\s*\?[\s\S]*?sms\.smsToday"[\s\S]*?: !recipient\.canSend && !recipient\.lastSmsStatus\s*\?/,
    "A client sent to today must say so on the reason line, checked before the generic reason",
  );
  // The reason line is the card's own second line, full width: in the name's
  // column the balance beside it cut a long date short.
  assert.match(row, /\{note \? \(\s*<View style=\{\[styles\.note, selectable \? styles\.noteSelectable : null\]\}>/);
  assert.match(row, /<Text\s+numberOfLines=\{2\}\s+style=\{\[\s*styles\.noteText,/, "Wraps rather than ending in an ellipsis");
  assert.match(row, /note: \{\s*flexBasis: "100%",/);
  assert.match(row, /flexWrap: "wrap",/);
  assert.doesNotMatch(
    row,
    /sentTodayBadge/,
    "'Sent today' belongs on the reason line only, not also as a title badge",
  );
  assert.match(
    row,
    /disabled=\{sendDisabled\}/,
    "The row's send button must be disabled while a send is in flight",
  );

  /* 3. One send at a time, visibly. */

  const screen = read("src/screens/ClientSmsScreen.tsx");
  assert.match(
    screen,
    /setSendingTarget\(recipient\.id\);/,
    "A single send must mark its row as sending",
  );
  assert.match(
    screen,
    /setSendingTarget\("bulk"\);/,
    "A bulk send must mark itself as sending",
  );
  assert.equal(
    (screen.match(/finally \{\s*submitting\.current = false;\s*setSendingTarget\(null\);/g) ?? []).length,
    2,
    "Both send paths must clear the sending state however they end",
  );
  assert.match(
    screen,
    /loading=\{sendingTarget === "bulk"\}\s*disabled=\{sendingTarget !== null\}/,
    "The bulk button must stay disabled until the request finishes",
  );
  // The bar under a selection: the words give way and wrap, the button keeps
  // its size. A longer language once pushed the button off the screen.
  assert.match(screen, /<View style=\{styles\.footerCopy\}>[\s\S]{0,300}?numberOfLines=\{2\}>\s*\{t\("sms\.selectedHint"\)\}/);
  assert.match(screen, /footerCopy: \{ flex: 1, minWidth: 0 \},/);
  assert.match(screen, /footerButton: \{ minHeight: 38, minWidth: 142, flexShrink: 0 \},/);
  assert.doesNotMatch(
    screen,
    /onSend=\{\(value\) =>/,
    "An inline onSend arrow defeats the row memo and repaints every row",
  );

  /* 4. The list reflects the send before the refetch lands. */

  const hook = read("src/modules/client-sms/hooks/useClientSms.ts");
  assert.match(
    hook,
    /markRecipientsSentToday\(page\.results, new Set\(\[clientId\]\)\)/,
    "A successful single send must close the client for today at once",
  );

  /* 5. A bulk result made only of skips is not a success. */

  assert.match(screen, /getBulkResultTone\(result\)/);
  assert.doesNotMatch(
    screen,
    /result\.failedCount \? "error" : "success"/,
    "An all-skipped batch must not be reported as a success",
  );
  assert.match(screen, /groupSmsIssues\(bulkSummary\.results\)/);

  const uz = read("src/i18n/translations/uz.ts");
  const ru = read("src/i18n/translations/ru.ts");
  assert.match(uz, /sentToday: "Bugun yuborilgan"/);
  assert.match(ru, /sentToday: "Отправлено сегодня"/);

  /* 6. Sending needs the owner's verified phone. */

  assert.match(
    screen,
    /requireVerifiedPhone\(\(\) => void performSendOne\(recipient\), "sms"\)/,
    "A single send must ask for phone verification first, saying it is for SMS",
  );
  assert.match(
    screen,
    /requireVerifiedPhone\(\(\) => void performBulkSend\(recipientIds\), "sms"\)/,
    "A bulk send must ask for phone verification first, saying it is for SMS",
  );
  assert.match(
    uz,
    /phoneVerificationSmsDescription:/,
    "The verification modal must explain that SMS sending needs the phone",
  );
  // After verification the callback runs from a closure made before the user
  // updated. If the send itself re-checked, it would reopen the modal forever.
  const between = (from, to) => screen.slice(screen.indexOf(from), screen.indexOf(to));
  assert.doesNotMatch(
    between("const performSendOne = useCallback", "const sendToOne = useCallback"),
    /requireVerifiedPhone/,
    "The single send itself must not re-check verification",
  );
  assert.doesNotMatch(
    between("const performBulkSend = async", "const handleSend = useCallback"),
    /requireVerifiedPhone/,
    "The bulk send itself must not re-check verification",
  );

  console.log("SMS daily limit badge, send guard and result summary contract passed");
} finally {
  if (previousLoader) {
    require.extensions[".ts"] = previousLoader;
  } else {
    delete require.extensions[".ts"];
  }
}
