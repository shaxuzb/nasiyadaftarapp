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
  assert.match(
    screen,
    /useSmsTemplate/,
    "Client SMS screen must load the server-side SMS template",
  );
  assert.match(
    screen,
    /renderSmsTemplate/,
    "Client SMS confirmation must render a template preview",
  );
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
