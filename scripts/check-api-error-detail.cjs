// The backend answers every failure with the same ProblemDetails shape:
//
//   { detail: "SMS allaqachon yuborildi. Iltimos, biroz kuting.",
//     status: 400, title: "Bad request", traceId: "0HNOP7FP0AAMC:00000001" }
//
// `detail` is the sentence written for the person using the app, and it is
// almost always more useful than anything the app could substitute. `title` is
// only the status name and must never reach a toast.
//
// The rules this locks down:
//   - any 4xx with a usable detail shows that detail
//   - 401 keeps the translated "session expired" message, because an expired
//     session is not something the user can act on — except on the sign-in
//     screen, where a 401 describes the attempt that just failed
//   - 5xx keeps the app's own message; server-side failures carry no advice
//   - a machine code in `detail` is translated rather than echoed back
//   - `title` alone never becomes the message
//
// The test loads the real modules; only the transport is faked.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const previousLoader = require.extensions[".ts"];

require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

try {
  const { createTranslator } = require(
    path.join(root, "src", "i18n", "translate.ts"),
  );
  const { getLocalizedApiErrorMessage } = require(
    path.join(root, "src", "i18n", "apiErrors.ts"),
  );
  const { AxiosError } = require("axios");

  const uz = createTranslator("uz");
  const ru = createTranslator("ru");

  const problem = (status, data) =>
    new AxiosError("request failed", "ERR_BAD_REQUEST", undefined, undefined, {
      status,
      data,
    });

  const DETAIL = "SMS allaqachon yuborildi. Iltimos, biroz kuting.";
  const SMS_KEY = "auth.phoneAuth.requestError";
  const body = (status) => ({
    detail: DETAIL,
    status,
    title: "Bad request",
    traceId: "0HNOP7FP0AAMC:00000001",
  });

  // The exact payload the SMS endpoint returns.
  assert.equal(
    getLocalizedApiErrorMessage(problem(400, body(400)), SMS_KEY, uz),
    DETAIL,
    "A 400 must show the server's explanation, not a generic message",
  );
  assert.equal(
    getLocalizedApiErrorMessage(problem(400, body(400)), SMS_KEY, ru),
    DETAIL,
    "The server's explanation is shown whatever the app language is",
  );

  // Every other 4xx behaves the same way.
  for (const status of [400, 403, 404, 409, 422, 429]) {
    assert.equal(
      getLocalizedApiErrorMessage(problem(status, body(status)), SMS_KEY, uz),
      DETAIL,
      `A ${status} must show the server's explanation`,
    );
  }

  // 401 and 5xx keep the app's own wording.
  assert.equal(
    getLocalizedApiErrorMessage(problem(401, body(401)), SMS_KEY, uz),
    uz("errors.unauthorized"),
    "An expired session must read as an expired session, not as the raw detail",
  );
  assert.equal(
    getLocalizedApiErrorMessage(problem(500, body(500)), SMS_KEY, uz),
    uz(SMS_KEY),
    "A server failure must keep the app's own message",
  );

  // The sign-in screen is the one place a 401 describes the attempt itself.
  assert.equal(
    getLocalizedApiErrorMessage(
      problem(401, { detail: "Kod noto‘g‘ri", status: 401 }),
      "auth.login.error",
      uz,
    ),
    "Kod noto‘g‘ri",
    "A failed sign-in must show why it failed",
  );

  // `title` is the status name and must never surface.
  assert.equal(
    getLocalizedApiErrorMessage(
      problem(400, { status: 400, title: "Bad request" }),
      SMS_KEY,
      uz,
    ),
    uz(SMS_KEY),
    "A body carrying only a title must fall back to the app's message",
  );

  // A machine code gets translated instead of echoed.
  assert.equal(
    getLocalizedApiErrorMessage(
      problem(400, { detail: "VALIDATION_ERROR", status: 400 }),
      SMS_KEY,
      uz,
    ),
    uz("errors.validation"),
    "A machine code must be translated, not shown raw",
  );

  // A dump too long for a toast falls back rather than filling the screen.
  assert.equal(
    getLocalizedApiErrorMessage(
      problem(400, { detail: "x".repeat(250), status: 400 }),
      SMS_KEY,
      uz,
    ),
    uz(SMS_KEY),
    "An overlong detail must not be forced into a toast",
  );

  // No response at all — a dropped connection — keeps the caller's message.
  assert.equal(
    getLocalizedApiErrorMessage(new Error("network"), SMS_KEY, uz),
    uz(SMS_KEY),
    "A transport failure must keep the caller's message",
  );

  // A request the app refused to send because the device is offline never
  // reached a server, so "could not save" would point at the wrong thing.
  const { assertOnlineForMutation, setOfflineMutationMessage } = require(
    path.join(root, "src", "core", "network", "networkState.ts"),
  );
  setOfflineMutationMessage("Internet aloqasini tekshiring");
  let offlineError;
  try {
    assertOnlineForMutation("offline");
  } catch (error) {
    offlineError = error;
  }
  assert.ok(offlineError, "Mutating while offline must throw");
  assert.equal(
    getLocalizedApiErrorMessage(offlineError, SMS_KEY, uz),
    "Internet aloqasini tekshiring",
    "Being offline must say so, not report a generic failure",
  );

  console.log("API error detail surfacing contract passed");
} finally {
  if (previousLoader) {
    require.extensions[".ts"] = previousLoader;
  } else {
    delete require.extensions[".ts"];
  }
}
