const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  "src/modules/reports/services/reportsService.ts",
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

let request;
const apiClient = {
  get: async (url, config) => {
    request = { url, config };
    return {
      data: {
        totalDebt: 600000,
        totalPayment: 280000,
        remainingBalance: 320000,
        topDebtors: [
          {
            clientId: 82,
            fullName: "Зохиджон akam",
            phoneNumber: "+998913746666",
            balance: 150000,
          },
          {
            clientId: 81,
            fullName: "Абай Зовхоз 38",
            phoneNumber: "+998933160969",
            balance: 70000,
          },
        ],
      },
    };
  },
};
const moduleExports = {};
vm.runInNewContext(code, {
  exports: moduleExports,
  require(name) {
    if (name === "../../../services/axiosService") return { apiClient };
    if (name === "expo-file-system")
      return { File: class {}, Paths: { cache: "cache" } };
    if (name === "expo-sharing") return {};
    return {};
  },
  console,
  Uint8Array,
});

(async () => {
  const report = await moduleExports.getReports();
  assert.equal(request.url, "/reports");
  assert.equal(report.totalDebt, 600000);
  assert.equal(report.totalPayment, 280000);
  assert.equal(report.remainingBalance, 320000);
  assert.equal(report.totalClients, 0);
  assert.equal(report.activeDebtorsCount, 0);
  assert.equal(report.paymentEfficiencyPercent, (280000 / 600000) * 100);
  assert.equal(report.currentMonthDebt, 600000);
  assert.equal(report.currentMonthPayment, 280000);
  assert.equal(report.currentMonthBalance, 320000);
  assert.deepEqual(JSON.parse(JSON.stringify(report.topDebtors)), [
    {
      clientId: 82,
      fullName: "Зохиджон akam",
      phoneNumber: "+998913746666",
      balance: 150000,
    },
    {
      clientId: 81,
      fullName: "Абай Зовхоз 38",
      phoneNumber: "+998933160969",
      balance: 70000,
    },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(report.monthlyStatistics)), []);
  console.log("Reports new response parsing passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
