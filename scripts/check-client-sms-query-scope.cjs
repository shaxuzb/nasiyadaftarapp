const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function compile(file, requireFn) {
  const out = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports: out,
    require: requireFn ?? (() => ({})),
  });
  return out;
}
const keys = compile("src/core/query/queryKeys.ts");
assert.notDeepEqual(
  keys.queryKeys.clientSmsRecipients(7, { pageNumber: 1 }),
  keys.queryKeys.clientSmsRecipients(8, { pageNumber: 1 }),
);
const removed = [];
compile("src/core/query/queryInvalidation.ts", (name) =>
  name.endsWith("queryClient")
    ? {
        queryClient: {
          removeQueries: ({ queryKey }) => removed.push(queryKey),
          invalidateQueries: async () => {},
        },
      }
    : { queryKeys: keys.queryKeys },
).clearOrganizationQueries();
assert.ok(
  removed.some((key) => key[0] === "client-sms"),
  "Organization switch must clear client SMS cache",
);
console.log("Client SMS query scope isolation and organization cleanup passed");
