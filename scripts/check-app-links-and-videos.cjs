// Two things a user reaches from the profile:
//
// 1. Links (support, Telegram, Instagram, whatever comes next) are read from
//    GET /app/links instead of being written into the app.
// 2. Video lessons play inside the app and are offered where they help, never
//    in the way of the work.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function load(file, dependencies) {
  const code = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      URL,
      require: (name) => {
        if (name in dependencies) return dependencies[name];
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
    { filename: file },
  );
  return exports;
}

const linksUtils = load("src/modules/support/utils/appLinks.ts", {});

function createLinksService({ response, stored = null }) {
  const env = { requests: [], storage: stored, opened: [] };
  const service = load("src/modules/support/services/appLinksService.ts", {
    "@react-native-async-storage/async-storage": {
      default: {
        getItem: async () => env.storage,
        setItem: async (_key, value) => {
          env.storage = value;
        },
      },
    },
    "react-native": {
      Linking: {
        openURL: async (url) => {
          env.opened.push(url);
        },
      },
    },
    "../../../services/axiosService": {
      apiClient: {
        get: async (url) => {
          env.requests.push(url);
          if (response instanceof Error) throw response;
          return { data: response };
        },
      },
    },
    "../utils/appLinks": linksUtils,
  });
  return { env, service };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
// The service runs in a context of its own, so its arrays are not this file's
// arrays and a strict comparison needs them copied over first.
const plain = (value) => JSON.parse(JSON.stringify(value));

async function main() {
  /* 1. The list is asked for at the documented address and kept for later. */

  const answer = [
    { key: "telegram_channel", title: "Telegram kanal", url: "https://t.me/qarzdaftar" },
    { key: "youtube", title: "YouTube", url: "https://www.youtube.com/@rbsx" },
  ];
  const online = createLinksService({ response: answer });
  assert.deepEqual(plain(await online.service.fetchAppLinks()), answer);
  assert.deepEqual(
    online.env.requests,
    ["/app/links"],
    "The base URL already ends in /api, so the path is /app/links",
  );
  await flush();
  assert.deepEqual(JSON.parse(online.env.storage), answer, "A good answer is saved for an offline launch");
  assert.deepEqual(plain(online.service.getRememberedAppLinks()), answer);

  /* 2. Offline, the saved list is what the screens get. */

  const offline = createLinksService({
    response: new Error("Network Error"),
    stored: JSON.stringify(answer),
  });
  await assert.rejects(offline.service.fetchAppLinks());
  assert.deepEqual(plain(await offline.service.readCachedAppLinks()), answer);

  /* 3. Nothing saved, or something unreadable, means "no saved list", not a crash. */

  for (const stored of [null, "{broken", '{"not":"a list"}']) {
    const empty = createLinksService({ response: new Error("offline"), stored });
    assert.equal(await empty.service.readCachedAppLinks(), null);
  }

  /* 4. A wrong answer is an error, so what was shown before stays. */

  const wrong = createLinksService({ response: { message: "oops" }, stored: JSON.stringify(answer) });
  await assert.rejects(wrong.service.fetchAppLinks(), /not a list/);
  assert.deepEqual(JSON.parse(wrong.env.storage), answer, "A bad answer must not overwrite the saved list");

  /* 5. No address is written into a screen any more. */

  const hook = read("src/modules/support/hooks/useAppLinks.ts");
  assert.match(
    hook,
    /return query\.data \?\? cached \?\? DEFAULT_APP_LINKS;/,
    "Server first, then the saved list, then the bundled fallback",
  );
  for (const file of [
    "src/screens/SettingsScreen.tsx",
    "src/bottom-sheet/sheets/TelegramBotsSheet.tsx",
    "src/modules/support/hooks/useAdminContact.ts",
  ]) {
    assert.doesNotMatch(read(file), /https?:\/\/|t\.me\//, `${file} must not carry an address of its own`);
  }
  for (const gone of [
    "src/modules/support/services/socialLinksService.ts",
    "src/modules/support/services/adminContactService.ts",
  ]) {
    assert.equal(fs.existsSync(path.join(root, gone)), false, `${gone} held static links`);
  }
  const presentation = read("src/modules/support/utils/appLinkPresentation.ts");
  assert.match(
    presentation,
    /isKnownAppLinkKey\(key\) \? ICONS\[key\] : GENERIC_ICON/,
    "An unknown key still gets a row, with the generic icon",
  );
  const uz = read("src/i18n/translations/uz.ts");
  const ru = read("src/i18n/translations/ru.ts");
  for (const key of linksUtils.KNOWN_APP_LINK_KEYS) {
    for (const [name, source] of [["uz", uz], ["ru", ru]]) {
      assert.match(source, new RegExp(`\\b${key}: \\{\\s*title: "`), `${name}: wording for ${key}`);
    }
  }

  /* 6. Video lessons: one screen, reached from quiet places. The lessons come
        from the server, each with a code naming the screen it explains. */

  const types = read("src/types/index.ts");
  assert.match(types, /VideoLessons: \{ lessonId\?: string \} \| undefined;/);
  assert.match(
    read("src/navigation/index.tsx"),
    /<Stack\.Screen name="VideoLessons" component=\{VideoLessonsScreen\} \/>/,
  );
  assert.match(
    read("src/screens/SettingsScreen.tsx"),
    /title=\{t\("videoLessons\.profileRowTitle"\)\}[\s\S]*?onPress=\{\(\) => navigation\.navigate\("VideoLessons"\)\}/,
    "The profile must have a row for the lessons",
  );
  assert.match(read("src/screens/ClientSmsScreen.tsx"), /<VideoLessonButton code="sms" \/>/);
  assert.match(read("src/screens/ReportsScreen.tsx"), /<VideoLessonButton code="reports" \/>/);

  const customers = read("src/screens/CustomersScreen.tsx");
  assert.equal(
    (customers.match(/<VideoLessonButton/g) ?? []).length,
    1,
    "The customers screen offers the lesson in one place only",
  );
  assert.match(
    customers,
    /<VideoLessonButton\s+code="customers"[\s\S]{0,200}?\/>\s*<TouchableOpacity[\s\S]{0,300}?navigation\.navigate\("Notifications"\)/,
    "The lesson button sits in the header, just left of the notification bell",
  );
  // One sign for "lessons" everywhere: the graduation cap, in the header
  // buttons and on the profile row alike.
  const entry = read("src/modules/video-lessons/components/VideoLessonEntry.tsx");
  assert.match(entry, /name="school-outline"/);
  assert.doesNotMatch(entry, /help-circle|name="play"/, "The lesson button has one icon");
  assert.match(
    entry,
    /lessons\.data\?\.some\(\(lesson\) => lesson\.code === code\)[\s\S]{0,80}?if \(!offered\) return null;/,
    "No lesson with this code on the server: no button, rather than one opening another lesson",
  );
  // Sheets are drawn outside the navigator, where useNavigation() throws and
  // the sheet never opens. The button is used in sheets too.
  assert.doesNotMatch(entry, /import \{[^}]*\buseNavigation\b/, "The lesson button must work inside a bottom sheet");
  assert.match(entry, /navigationRef\.navigate\("VideoLessons", \{ lessonId: code \}\)/);
  const botsSheet = read("src/bottom-sheet/sheets/TelegramBotsSheet.tsx");
  assert.match(
    botsSheet,
    /onPress=\{\(\) => closeSheet\(\(\) => openVideoLesson\(TELEGRAM_LESSON_CODE\)\)\}/,
    "From a sheet, the lesson opens once the sheet has closed",
  );
  for (const file of fs.readdirSync(path.join(root, "src/bottom-sheet/sheets"))) {
    assert.doesNotMatch(
      read("src/bottom-sheet/sheets/" + file),
      /import \{[^}]*\buseNavigation\b/,
      `${file}: a sheet is outside the navigator; use navigationRef`,
    );
  }
  assert.match(
    read("src/screens/SettingsScreen.tsx"),
    /icon="school-outline"[\s\S]{0,200}?title=\{t\("videoLessons\.profileRowTitle"\)\}/,
    "The profile row uses the same sign as the header buttons",
  );

  /* 7. The player is paid for only when somebody watches. */

  const screen = read("src/screens/VideoLessonsScreen.tsx");
  assert.match(
    screen,
    /<SafeAreaView style=\{styles\.safe\} edges=\{\["top", "bottom"\]\}>/,
    "The lessons list must stay clear of the status bar and of the system bar at the bottom",
  );
  assert.match(
    screen,
    /\{playback === "playing" && selected\.youtubeId \? \(\s*<YouTubePlayer/,
    "The WebView must not exist until the viewer asks to watch",
  );
  assert.match(
    screen,
    /if \(state === "background"\) setPlayback\("idle"\);/,
    "Leaving the app must stop the video",
  );
  // Waiting, failing and having nothing each say so in words, with a way on.
  assert.match(screen, /lessonsQuery\.isPending \? \(\s*<StageSkeleton \/>/);
  assert.match(screen, /lessonsQuery\.isPending \? \(\s*<RowsSkeleton \/>/);
  assert.match(
    screen,
    /lessonsQuery\.isError \? \(\s*<EmptyState\s+iconName="cloud-offline-outline"\s+title=\{t\("videoLessons\.loadError"\)\}[\s\S]{0,300}?<PrimaryButton\s+label=\{t\("videoLessons\.retry"\)\}\s+loading=\{lessonsQuery\.isFetching\}/,
    "A failed load explains itself and offers a retry that shows it is working",
  );
  assert.match(screen, /title=\{t\("videoLessons\.empty"\)\}\s+description=\{t\("videoLessons\.emptyHint"\)\}/);
  assert.match(screen, /<RefreshControl\s+refreshing=\{isPullRefreshing\}/);
  assert.doesNotMatch(screen, /subscription\.loadingPlans/, "The lessons screen is not loading plans");
  // A failed video offers a retry and YouTube as real buttons.
  assert.match(screen, /onPress=\{\(\) => setPlayback\("playing"\)\}\s+style=\{\(\{ pressed \}\) => \[styles\.errorButton, styles\.errorButtonPrimary/);
  assert.match(read("src/modules/video-lessons/components/YouTubePlayer.tsx"), /\{t\("videoLessons\.loadingVideo"\)\}/);
  assert.equal(
    (read("src/modules/video-lessons/components/YouTubePlayer.tsx").match(/<WebView/g) ?? []).length,
    1,
  );
  const users = [];
  (function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && fs.readFileSync(full, "utf8").includes('from "react-native-webview"')) {
        users.push(path.relative(root, full).replace(/\\/g, "/"));
      }
    }
  })(path.join(root, "src"));
  assert.deepEqual(
    users,
    ["src/modules/video-lessons/components/YouTubePlayer.tsx"],
    "The WebView is for the video player and nothing else",
  );

  /* 8. The lessons as the server sends them. */

  const lessonService = load("src/modules/video-lessons/services/videoLessonService.ts", {
    "../../../services/axiosService": { apiClient: {} },
  });
  const parsed = lessonService.parseVideoLessons({
    results: [
      { id: 2, code: " SMS ", title: " SMS ", videoUrl: "https://youtu.be/abcdefghijk", sortOrder: 2 },
      { id: 1, code: "customers", title: "Mijozlar", description: " Qo‘shish ", videoUrl: "https://www.youtube.com/watch?v=ABCDEFGHIJK", sortOrder: 1 },
      { id: 3, title: "Hidden", videoUrl: "https://youtu.be/abcdefghijk", isActive: false },
      { id: 4, title: "Plain http", videoUrl: "http://youtu.be/abcdefghijk" },
      { id: 5, title: "  ", videoUrl: "https://youtu.be/abcdefghijk" },
    ],
  });
  assert.deepEqual(
    parsed.map((lesson) => [lesson.id, lesson.code, lesson.title, lesson.description, lesson.youtubeId]),
    [
      ["1", "customers", "Mijozlar", "Qo‘shish", "ABCDEFGHIJK"],
      ["2", "sms", "SMS", "", "abcdefghijk"],
    ],
    "Inactive, non-https and untitled lessons are left out; the rest go in the server's order",
  );
  assert.equal(parsed[0].thumbnailUrl, "https://i.ytimg.com/vi/ABCDEFGHIJK/mqdefault.jpg", "No picture given: YouTube's own");
  assert.throws(() => lessonService.parseVideoLessons("nope"), /Invalid video lesson response/);
  for (const [name, source] of [["uz", uz], ["ru", ru]]) {
    for (const key of ["loadingLessons", "loadingVideo", "loadError", "loadErrorHint", "empty", "emptyHint", "retry"]) {
      assert.match(source, new RegExp("\\n    " + key + ": \""), `${name}: videoLessons.${key}`);
    }
  }

  console.log("App links from the server, and in-app video lessons: checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
