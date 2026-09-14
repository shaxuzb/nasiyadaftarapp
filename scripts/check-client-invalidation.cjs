const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const queryKeys = {
  clients: (scope) => ["clients", scope],
  clientSearchRoot: (scope) => ["clients", scope, "search"],
  client: (scope, id) => ["client", scope, id],
  transactions: (scope) => ["transactions", scope],
  transactionHistory: (scope, id) => ["transactions", scope, "history", id],
  clientSmsRecipientsRoot: (scope) => ["client-sms", scope, "recipients"],
};

function load(file, dependencies = {}) {
  const source = fs.readFileSync(file, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: file });
  return exports;
}

function hasKey(keys, expected) {
  return keys.some((key) => JSON.stringify(key) === JSON.stringify(expected));
}

const mod = load("src/core/query/clientInvalidation.ts", {
  "./queryKeys": { queryKeys },
});

let keys = mod.getClientInvalidationKeys(42, "transaction", 8);
assert(hasKey(keys, ["clients", 42]));
assert(hasKey(keys, ["clients", 42, "search"]));
assert(hasKey(keys, ["client", 42, 8]));
assert(hasKey(keys, ["transactions", 42]));
assert(hasKey(keys, ["transactions", 42, "history", 8]));
assert(hasKey(keys, ["reports", 42]));
assert(hasKey(keys, ["client-sms", 42, "recipients"]));
assert(!hasKey(keys, ["subscription"]));
assert(!hasKey(keys, ["clients", 99]));

keys = mod.getClientInvalidationKeys(42, "created");
assert(hasKey(keys, ["clients", 42]));
assert(hasKey(keys, ["reports", 42]));
assert(hasKey(keys, ["client-sms", 42, "recipients"]));
assert(!hasKey(keys, ["transactions", 42]));

keys = mod.getClientInvalidationKeys(42, "updated", 8);
assert(hasKey(keys, ["client", 42, 8]));
assert(hasKey(keys, ["clients", 42]));
assert(hasKey(keys, ["reports", 42]));

keys = mod.getClientInvalidationKeys(42, "deleted", 8);
assert(hasKey(keys, ["client", 42, 8]));
assert(hasKey(keys, ["transactions", 42, "history", 8]));
assert(hasKey(keys, ["reports", 42]));

keys = mod.getClientInvalidationKeys(42, "refresh");
assert(hasKey(keys, ["clients", 42]));
assert(hasKey(keys, ["transactions", 42]));
assert(hasKey(keys, ["reports", 42]));

console.log("Client domain invalidation policy passed");
