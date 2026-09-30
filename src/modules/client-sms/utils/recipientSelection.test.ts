// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { isSmsRecipientSelectable, markRecipientsSentToday, selectEligibleRecipients } from "./recipientSelection.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(
  isSmsRecipientSelectable({ id: 1, canSend: true, phone: "+998901234567" }),
  "a sendable recipient with a phone should be selectable",
);
assert(
  !isSmsRecipientSelectable({ id: 2, canSend: true, phone: "" }),
  "a recipient without a phone must not be selectable",
);
assert(
  !isSmsRecipientSelectable({ id: 3, canSend: false, phone: "+998901234567" }),
  "a recipient rejected by the API must not be selectable",
);
assert(
  selectEligibleRecipients([
    { id: 1, canSend: true, phone: "+998901234567" },
    { id: 2, canSend: true, phone: "" },
    { id: 3, canSend: false, phone: "+998901234567" },
  ]).has(1),
  "select all should include only sendable recipients with phones",
);
assert(
  selectEligibleRecipients([
    { id: 1, canSend: true, phone: "+998901234567" },
    { id: 2, canSend: true, phone: "" },
    { id: 3, canSend: false, phone: "+998901234567" },
  ]).size === 1,
  "select all should exclude missing-phone recipients",
);

// Marking a client as sent today closes them to another SMS at once.
const page = [
  { id: 1, canSend: true, smsSentToday: false, phone: "+998901112233" },
  { id: 2, canSend: true, smsSentToday: false, phone: "+998901112244" },
];
const marked = markRecipientsSentToday(page, new Set([2]));
assert(marked[1].smsSentToday && !marked[1].canSend, "The sent client is closed for today");
assert(!isSmsRecipientSelectable(marked[1]), "A client sent today cannot be selected again");
assert(marked[0] === page[0], "Other clients keep their object identity");
assert(
  markRecipientsSentToday(page, new Set([99])) === page,
  "A page without the client is returned untouched",
);

console.log("SMS recipient phone eligibility tests passed");
