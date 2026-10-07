// A notification can carry a `link`: with the push as `data.link`, and with
// each inbox item. Tapping it goes there — a screen in the app when it starts
// with "/", an outside address otherwise — and with no link, or one that leads
// nowhere on this device, the inbox opens exactly as it always did.
//
// The pieces are run against a fake navigator, so the routing decisions are
// exercised rather than read.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));

function load(file, dependencies) {
  const code = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      require: (name) => {
        if (name in dependencies) return dependencies[name];
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
    { filename: file },
  );
  return exports;
}

const linkUtils = load("src/modules/push/utils/notificationLink.ts", {});
const appLinks = load("src/modules/support/utils/appLinks.ts", {});

// Stands in for the backend's list until the real table is filled in.
const testRules = [
  { pattern: "/reports", build: () => ({ screen: "MainTabs", tab: "Reports" }) },
  {
    pattern: "/customers/:customerId",
    build: (params) => {
      const customerId = linkUtils.parseRouteId(params.customerId);
      return customerId ? { screen: "CustomerDetail", params: { customerId } } : null;
    },
  },
  { pattern: "/subscription", build: () => ({ screen: "Subscription" }) },
];

function createService({ navigates = true, openFails = false } = {}) {
  const env = { routes: [], opened: [] };
  // The real opener, so what reaches the OS here is what reaches it in the app.
  const links = load("src/modules/support/services/appLinksService.ts", {
    "@react-native-async-storage/async-storage": { default: {} },
    "react-native": {
      Linking: {
        openURL: async (url) => {
          if (openFails) throw new Error("no handler");
          env.opened.push(url);
        },
      },
    },
    "../../../services/axiosService": { apiClient: {} },
    "../utils/appLinks": appLinks,
  });
  const service = load("src/modules/push/services/notificationNavigation.ts", {
    "../../support/services/appLinksService": links,
    "../../../navigation/navigationRef": {
      navigateToInternalRoute: (route) => {
        env.routes.push(plain(route));
        return navigates;
      },
    },
    "../../support/utils/appLinks": appLinks,
    "../utils/notificationLink": {
      ...linkUtils,
      matchInternalRoute: (target) => linkUtils.matchInternalRoute(target, testRules),
    },
  });
  return { env, service };
}

function createNavigationRef({ ready = true, routeNames, tabNames } = {}) {
  const dispatched = [];
  const ref = {
    isReady: () => ready,
    getRootState: () => ({
      routeNames: routeNames ?? ["MainTabs", "CustomerDetail", "Notifications"],
      routes: [
        { name: "MainTabs", state: tabNames ? { routeNames: tabNames } : undefined },
      ],
    }),
    dispatch: (action) => dispatched.push(action),
    navigate: (...args) => dispatched.push({ type: "navigate", args }),
  };
  const module = load("src/navigation/navigationRef.ts", {
    "@react-navigation/native": {
      createNavigationContainerRef: () => ref,
      CommonActions: { navigate: (payload) => ({ type: "NAVIGATE", payload }) },
    },
  });
  return { module, dispatched };
}

async function main() {
  /* 1. "/" goes to a screen in the app. */

  const internal = createService();
  assert.equal(await internal.service.openNotificationLink("/customers/42"), true);
  assert.deepEqual(internal.env.routes, [
    { screen: "CustomerDetail", params: { customerId: 42 } },
  ]);
  assert.deepEqual(internal.env.opened, [], "A path in the app must never reach the browser");

  /* 2. Anything else is an outside address, if it is safe to open. */

  const external = createService();
  assert.equal(await external.service.openNotificationLink("https://t.me/qarzdaftar"), true);
  assert.deepEqual(external.env.opened, ["https://t.me/qarzdaftar"]);
  assert.deepEqual(external.env.routes, []);
  for (const unsafe of ["javascript:alert(1)", "http://example.com", "intent://x#Intent;end", "//evil.example"]) {
    assert.equal(await external.service.openNotificationLink(unsafe), false, unsafe);
  }
  assert.equal(external.env.opened.length, 1, "An unsafe address must not be opened");

  // The usual case: the backend sends a full https:// address.
  const web = createService();
  assert.equal(await web.service.openNotificationLink("  https://qarzdaftar.uz/news/12?ref=push  "), true);
  assert.equal(await web.service.openNotificationLink("HTTPS://Qarzdaftar.uz/aksiya"), true);
  assert.equal(await web.service.openNotificationLink("https://qarzdaftar.uz/янгилик"), true);
  assert.deepEqual(web.env.opened, [
    "https://qarzdaftar.uz/news/12?ref=push",
    "HTTPS://Qarzdaftar.uz/aksiya",
    "https://qarzdaftar.uz/%D1%8F%D0%BD%D0%B3%D0%B8%D0%BB%D0%B8%D0%BA",
  ], "Trimmed, and Cyrillic escaped so iOS will open it");

  /* 3. Nothing to follow reports false, so the caller opens the inbox. */

  const nowhere = createService();
  for (const link of [null, undefined, "", "   ", "/unknown-path", "/customers/abc"]) {
    assert.equal(await nowhere.service.openNotificationLink(link), false, String(link));
  }
  assert.equal(
    await createService({ navigates: false }).service.openNotificationLink("/subscription"),
    false,
    "A screen not offered on this device counts as nowhere",
  );
  assert.equal(
    await createService({ openFails: true }).service.openNotificationLink("https://t.me/x"),
    false,
    "An address nothing can open counts as nowhere",
  );

  /* 4. The inbox marks only the rows that lead somewhere. */

  const hints = createService().service;
  assert.deepEqual(plain(hints.describeNotificationLink("/reports")), { kind: "internal" });
  assert.deepEqual(plain(hints.describeNotificationLink("https://www.t.me/x")), {
    kind: "external",
    host: "t.me",
  });
  assert.deepEqual(plain(hints.describeNotificationLink("tel:+998901234567")), {
    kind: "external",
    host: "",
  });
  for (const link of [null, "", "/unknown-path", "javascript:alert(1)"]) {
    assert.equal(hints.describeNotificationLink(link), null, String(link));
  }

  /* 5. Navigation refuses rather than sending the user nowhere. */

  const stack = createNavigationRef();
  assert.equal(
    stack.module.navigateToInternalRoute({ screen: "CustomerDetail", params: { customerId: 7 } }),
    true,
  );
  assert.deepEqual(plain(stack.dispatched), [
    { type: "NAVIGATE", payload: { name: "CustomerDetail", params: { customerId: 7 } } },
  ]);

  const tabs = createNavigationRef({ tabNames: ["Customers", "Reports", "Settings"] });
  assert.equal(tabs.module.navigateToInternalRoute({ screen: "MainTabs", tab: "Reports" }), true);
  assert.deepEqual(plain(tabs.dispatched), [
    { type: "NAVIGATE", payload: { name: "MainTabs", params: { screen: "Reports" } } },
  ]);
  assert.equal(
    tabs.module.navigateToInternalRoute({ screen: "MainTabs", tab: "ClientSms" }),
    false,
    "A tab hidden on this device must not be navigated to",
  );
  assert.equal(
    createNavigationRef().module.navigateToInternalRoute({ screen: "Subscription" }),
    false,
    "A screen left out by region or plan must not be navigated to",
  );
  assert.equal(
    createNavigationRef({ ready: false }).module.navigateToInternalRoute({ screen: "CustomerDetail" }),
    false,
  );

  /* 6. A tapped push: follow the link and mark it read, or open the inbox. */

  function createOpener(opens) {
    const env = { read: [], inbox: [] };
    const hook = load("src/modules/push/hooks/useOpenNotification.ts", {
      react: { useCallback: (callback) => callback },
      "../../../navigation/navigationRef": {
        navigateToPushNotification: (id) => env.inbox.push(id),
      },
      "../services/notificationNavigation": { openNotificationLink: async () => opens },
      "./usePushQueries": {
        useMarkPushNotificationRead: () => ({ mutate: (id) => env.read.push(id) }),
      },
    });
    return { env, open: hook.useOpenNotification() };
  }

  const followed = createOpener(true);
  await followed.open({ notificationId: 9, link: "/reports" });
  assert.deepEqual(followed.env.read, [9], "Following a link counts as reading the message");
  assert.deepEqual(followed.env.inbox, [], "With a link that works the inbox must not open");

  const anonymous = createOpener(true);
  await anonymous.open({ notificationId: null, link: "https://t.me/x" });
  assert.deepEqual(anonymous.env.read, [], "Nothing to mark without an id");

  const fallback = createOpener(false);
  await fallback.open({ notificationId: 9, link: "/unknown-path" });
  await fallback.open({ notificationId: 4, link: null });
  assert.deepEqual(fallback.env.inbox, [9, 4], "No usable link opens the inbox, as before");
  assert.deepEqual(fallback.env.read, [], "Opening the inbox does not mark anything read");

  /* 7. All three taps go through the same door. */

  const context = read("src/modules/push/context/PushNotificationContext.tsx");
  assert.equal(
    (context.match(/getNotificationLinkFromData\(/g) ?? []).length,
    3,
    "The link must be read for a foreground push, a tapped one, and the one that launched the app",
  );
  assert.match(
    read("src/navigation/index.tsx"),
    /void openNotification\(\{\s*notificationId: pendingNotificationId,\s*link: pendingNotificationLink,\s*\}\);/,
    "A tapped system notification must follow its link",
  );
  assert.match(
    read("src/modules/push/components/PushInAppBanner.tsx"),
    /void openNotification\(\{ notificationId, link \}\);/,
    "The in-app banner must follow the link too",
  );
  const inbox = read("src/screens/NotificationsScreen.tsx");
  assert.match(
    inbox,
    /void openNotificationLink\(link\)\.then\(\(opened\) => \{\s*if \(opened\) return;[\s\S]{0,400}?showToast\(/,
    "An inbox row must follow its link, and say so when it could not",
  );
  assert.match(inbox, /if \(!link\) return;/, "A row without a link stays silent, as before");
  assert.match(
    inbox,
    /\{linkInfo \? \(\s*<View style=\{styles\.linkAction\}>[\s\S]{0,500}?t\("notifications\.openLink"\)/,
    "A row that leads somewhere must say so in words, not with a bare arrow",
  );
  assert.doesNotMatch(inbox, /chevron-forward/, "The unexplained arrow is gone");
  assert.match(
    read("src/modules/push/services/pushService.ts"),
    /link: parseNotificationLinkValue\(item\.link\),/,
    "The inbox response's link must be read",
  );

  console.log("Notification links: in-app paths, outside addresses and the inbox fallback passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
