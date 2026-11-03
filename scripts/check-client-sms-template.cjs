const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadTypeScript(filename, requireResolver = () => ({})) {
  const source = fs.readFileSync(filename, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleExports = {};
  vm.runInNewContext(code, {
    exports: moduleExports,
    require: requireResolver,
  });
  return moduleExports;
}

const parsing = loadTypeScript("src/modules/client-sms/utils/smsParsing.ts");
const screen = fs.readFileSync("src/screens/ClientSmsScreen.tsx", "utf8");
const calls = [];
const apiClient = {
  post: async (url, body) => {
    calls.push({ url, body });
    return {
      data: {
        data: {
          message: " Assalom Ali, 100 000 so'm qarzingiz bor. ",
          requested: 2,
          eligible: 1,
          sendNow: 0,
          queued: 1,
          skipped: 1,
          ownDevice: true,
          skippedClients: [{ clientId: 2, fullName: "Vali", reason: "Bugun yuborilgan" }, { clientId: 0 }],
        },
      },
    };
  },
  get: async (url, config) => {
    calls.push({ url, config });
    return {
      data: {
        template:
          "Assalom {fullName}, {organizationName}da {balance} qarzingiz bor.",
        placeholders: ["{organizationName}", "{balance}", "{fullName}"],
      },
    };
  },
};
const service = loadTypeScript(
  "src/modules/client-sms/services/clientSmsService.ts",
  (name) => {
    if (name.endsWith("axiosService")) return { apiClient };
    if (name.includes("smsParsing")) return parsing;
    return {};
  },
);

(async () => {
  // What the user is asked to confirm is the text the server will send,
  // worked out by the server for exactly these clients (queue and limits
  // included), not a guess drawn from the template in the app.
  assert.match(
    screen,
    /const preview = await previewDebtSms\(\[recipient\.id\]\);\s*const accepted = await confirm\(\{[\s\S]{0,120}?message: `\$\{preview\.message\}/,
    "Sending to one client shows the server's preview first",
  );
  assert.match(
    screen,
    /const preview = await previewDebtSms\(recipientIds\);\s*const accepted = await confirm\(\{[\s\S]{0,120}?message: `\$\{preview\.message\}/,
    "Sending to many shows the server's preview first",
  );
  assert.equal(
    (screen.match(/if \(!accepted \|\| preview\.eligible === 0\) return;/g) ?? []).length,
    2,
    "Nothing is sent when the user declines or nobody can receive it",
  );

  const preview = await service.previewDebtSms([1, 2]);
  assert.equal(calls[0].url, "/clients/debt-sms/preview");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)), { clientIds: [1, 2] });
  assert.equal(preview.message, "Assalom Ali, 100 000 so'm qarzingiz bor.");
  assert.deepEqual([preview.requested, preview.eligible, preview.sendNow, preview.queued, preview.skipped], [2, 1, 0, 1, 1]);
  assert.equal(preview.ownDevice, true);
  assert.deepEqual(JSON.parse(JSON.stringify(preview.skippedClients)), [
    { clientId: 2, fullName: "Vali", reason: "Bugun yuborilgan" },
  ]);
  await assert.rejects(() => service.previewDebtSms([1, 0]), /mijozlarni tekshiring/);
  assert.throws(() => parsing.parseSmsPreview({ data: { message: "  " } }), /noto'g'ri formatda/);
  calls.length = 0;

  const template = await service.getDebtSmsTemplate();
  assert.deepEqual(JSON.parse(JSON.stringify(template)), {
    template:
      "Assalom {fullName}, {organizationName}da {balance} qarzingiz bor.",
    placeholders: ["{organizationName}", "{balance}", "{fullName}"],
  });
  assert.equal(calls[0].url, "/clients/debt-sms/template");

  const rendered = parsing.renderSmsTemplate(template.template, {
    fullName: "Ali",
    organizationName: "Nasiya Daftari",
    balance: "100 000 so'm",
  });
  assert.equal(
    rendered,
    "Assalom Ali, Nasiya Daftarida 100 000 so'm qarzingiz bor.",
  );
  assert.equal(
    parsing.renderSmsTemplate("Salom {missing}", {}),
    "Salom {missing}",
  );
  console.log("Client SMS template fetch and preview rendering passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
