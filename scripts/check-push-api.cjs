const assert = require("node:assert/strict");
const fs = require("node:fs");

const service = fs.readFileSync(
  "src/modules/push/services/pushService.ts",
  "utf8",
);
const hooks = fs.readFileSync(
  "src/modules/push/hooks/usePushQueries.ts",
  "utf8",
);
const keys = fs.readFileSync("src/core/query/queryKeys.ts", "utf8");

assert.match(service, /apiClient\.put\("\/push\/devices",\s*payload\)/);
assert.match(service, /apiClient\.delete\(`\/push\/devices\/\$\{encodeURIComponent\(installationId\)\}`\)/);
assert.match(service, /apiClient\.get<unknown>\("\/push\/notifications",/);
assert.match(service, /page:\s*params\.page/);
assert.match(service, /pageSize:\s*params\.pageSize/);
assert.match(service, /"\/push\/notifications\/unread-count"/);
assert.match(service, /apiClient\.post\(`\/push\/notifications\/\$\{id\}\/read`\)/);
assert.match(service, /data\.results/);
assert.match(service, /data\.count/);
assert.match(keys, /pushRoot:/);
assert.match(keys, /pushNotifications:/);
assert.match(keys, /pushUnreadCount:/);
assert.match(hooks, /useInfiniteQuery/);
assert.match(hooks, /initialPageParam:\s*1/);
assert.match(hooks, /getNextPageParam/);
assert.match(hooks, /useUnreadPushNotificationCount/);
assert.match(hooks, /useMarkPushNotificationRead/);

console.log("Push notification API contract passed");
