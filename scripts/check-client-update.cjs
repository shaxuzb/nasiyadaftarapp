const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { QueryClient } = require("@tanstack/react-query");

// Use the real service and mutation callbacks with an isolated HTTP boundary.
// No requests or customer changes are sent to the live backend.
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
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

async function main() {
  const calls = [];
  let failure;
  const api = load("src/services/clientsApi.ts", {
    "./axiosService": { apiClient: {
      put: async (url, payload) => {
        calls.push({ url, payload });
        if (failure) throw failure;
        return { status: 200, data: "" };
      },
    } },
    "../modules/clients/utils/clientList": load("src/modules/clients/utils/clientList.ts"),
  });
  const payload = { fullName: "Ali Valiyev", phoneNumber: "+998901234567", note: "Yangi izoh" };
  await api.updateClient(82, payload);
  assert.equal(calls.length, 1, "A successful empty response must not require another request");
  assert.equal(calls[0].url, "/clients/82");
  assert.equal(calls[0].payload, payload);
  failure = new Error("Network failure");
  await assert.rejects(api.updateClient(82, payload), (error) => error === failure);

  const { queryKeys } = load("src/core/query/queryKeys.ts");
  const organizationScope = load("src/core/query/organizationScope.ts");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const old = { id: 82, fullName: "Ali", phone: "+998909999999", note: "", currentBalance: 500000, createdAt: "2026-08-22" };
  const other = { ...old, id: 83, fullName: "Boshqa mijoz" };
  const listKey = queryKeys.clients(7);
  const detailKey = queryKeys.client(7, 82);
  const searchKey = queryKeys.clientSearch(7, "Ali");
  client.setQueryData(listKey, [old, other]);
  client.setQueryData(detailKey, old);
  client.setQueryData(searchKey, { customers: [old], count: 1 });
  client.setQueryData(queryKeys.clients(8), [old]);
  let mutation;
  const queries = [];
  const hook = load("src/modules/clients/hooks/useClientDetail.ts", {
    "@tanstack/react-query": {
      useQueryClient: () => client,
      useQuery: (options) => { queries.push(options); return {}; },
      useMutation: (options) => { mutation = options; return {}; },
    },
    "../../../context/AuthContext": {
      useAuth: () => ({
        user: { id: 2, organizationId: 7 },
        currentOrganization: { id: 7, name: "Test organization" },
      }),
    },
    "../../../core/query/organizationScope": organizationScope,
    "../../../core/query/queryKeys": { queryKeys },
    "../services/clientsService": api,
    "../../transactions/services/transactionsService": api,
  });
  hook.useClientDetail(82);
  assert.equal(queries[0].initialData(), old);
  await mutation.onSuccess(undefined, payload);
  const updated = client.getQueryData(detailKey);
  assert.equal(updated.fullName, payload.fullName);
  assert.equal(updated.phone, payload.phoneNumber);
  assert.equal(updated.note, payload.note);
  assert.equal(updated.currentBalance, 500000, "Editing identity must not reset debt");
  assert.equal(updated.createdAt, old.createdAt);
  assert.equal(client.getQueryData(listKey)[0].phone, payload.phoneNumber);
  assert.equal(client.getQueryData(listKey)[1], other);
  assert.equal(client.getQueryData(queryKeys.clients(8))[0], old, "Other organizations must remain unchanged");
  assert.equal(client.getQueryState(searchKey).isInvalidated, true, "Renaming must refresh search membership");
  client.clear();
  console.log("Client update: empty 200, errors, cache synchronization, balance preservation and scope isolation passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
