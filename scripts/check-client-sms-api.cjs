const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename = "src/modules/client-sms/services/clientSmsService.ts";
const source = fs.readFileSync(filename, "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const calls = [];
let nextData;
const apiClient = {
  get: async (url, config) => {
    calls.push({ method: "get", url, params: config?.params });
    return { data: nextData };
  },
  post: async (url, body) => {
    calls.push({ method: "post", url, body });
    return { data: nextData };
  },
};
const moduleExports = {};
vm.runInNewContext(code, {
  exports: moduleExports,
  require(name) {
    if (name.endsWith("axiosService")) return { apiClient };
    if (name.includes("smsParsing")) {
      const parserSource = fs.readFileSync(
        "src/modules/client-sms/utils/smsParsing.ts",
        "utf8",
      );
      const parserCode = ts.transpileModule(parserSource, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText;
      const parserExports = {};
      vm.runInNewContext(parserCode, { exports: parserExports });
      return parserExports;
    }
    return {};
  },
});

(async () => {
  nextData = {
    count: 1,
    results: [
      {
        id: 1,
        fullName: "Ali",
        phoneNumber: "+99890",
        currentBalance: 5000,
        overdueBalance: 3000,
        isBlacklisted: true,
        canSend: true,
      },
    ],
  };
  const recipients = await moduleExports.getSmsRecipients({
    search: " Ali ",
    blacklisted: true,
    hasDebt: true,
    canSend: true,
    pageNumber: 2,
    pageSize: 20,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).params)), {
    search: "Ali",
    blacklisted: true,
    hasDebt: true,
    canSend: true,
    pageNumber: 2,
    pageSize: 20,
  });
  assert.equal(recipients.count, 1);
  assert.equal(recipients.results[0].phone, "+99890");
  nextData = {
    sentCount: 1,
    failedCount: 1,
    skippedCount: 1,
    results: [{ clientId: 1, status: "sent" }],
  };
  const bulk = await moduleExports.sendBulkDebtSms([1, 2, 2, 0, -1, 3.5, 3]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).body)), {
    clientIds: [1, 2, 3],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(bulk)), {
    sentCount: 1,
    failedCount: 1,
    skippedCount: 1,
    results: [{ clientId: 1, status: "sent" }],
  });
  const before = calls.length;
  await assert.rejects(() => moduleExports.sendBulkDebtSms([0, -1]));
  assert.equal(calls.length, before);
  nextData = {
    items: [
      {
        id: 9,
        clientId: 1,
        fullName: "Ali",
        phoneNumber: "+99890",
        status: "FAILED",
        sentDate: "2026-09-09",
        errorMessage: "Limit",
      },
    ],
    count: 1,
  };
  const history = await moduleExports.getDebtSmsHistory({
    status: "failed",
    search: " Ali ",
    pageNumber: 1,
    pageSize: 20,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).params)), {
    status: "failed",
    search: "Ali",
    pageNumber: 1,
    pageSize: 20,
  });
  assert.equal(history.results[0].normalizedStatus, "failed");

  const allRecipients = await moduleExports.getSmsRecipients({
    search: "",
    hasDebt: true,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).params)), {
    hasDebt: true,
  });
  assert.equal(allRecipients.count, 1);

  nextData = {};
  await moduleExports.sendDebtSms(1);
  assert.equal(calls.at(-1).url, "/clients/1/debt-sms");

  const clientSmsScreen = fs.readFileSync(
    "src/screens/ClientSmsScreen.tsx",
    "utf8",
  );
  assert.doesNotMatch(
    clientSmsScreen,
    /PAGE_SIZE|pageNumber|pageSize|selectPage|styles\.pagination/,
    "ClientSmsScreen should rely on the backend default list and must not keep UI pagination",
  );

  console.log(
    "Client SMS API filters, parsing, individual/bulk payloads and validation passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
