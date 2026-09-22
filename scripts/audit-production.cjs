// Release-gate dependency audit.
//
// `npm audit --omit=dev` reports every advisory reachable from the production
// dependency tree, but most of them sit in Expo's build tooling (prebuild,
// Metro, Babel) and never reach the shipped bundle. A raw audit therefore fails
// on issues that cannot affect a user, which is how a release gate ends up
// being ignored.
//
// This script classifies each vulnerable package against a reviewed list and
// fails only on something new, something critical, or something that actually
// ships inside the app. Anything not listed here has never been reviewed and is
// treated as a blocker.
//
// When this fails with an unreviewed package: trace it with
//   npm ls <package> --omit=dev --all
// decide whether it ships in the bundle, then add it below with that reasoning.

const { spawnSync } = require("node:child_process");

const BUILD = "build";
const RUNTIME = "runtime";

const REVIEWED = {
  "@xmldom/xmldom": {
    scope: BUILD,
    via: "@expo/config-plugins -> xcode -> simple-plist",
    note: "Parses Info.plist during prebuild. Not bundled.",
  },
  uuid: {
    scope: BUILD,
    via: "@expo/config-plugins -> xcode",
    note: "Generates Xcode project ids during prebuild. Not bundled.",
  },
  browserslist: {
    scope: BUILD,
    via: "@expo/metro-config",
    note: "Target resolution while bundling. Not bundled.",
  },
  "baseline-browser-mapping": {
    scope: BUILD,
    via: "@expo/metro-config -> browserslist",
    note: "Target resolution while bundling. Not bundled.",
  },
  "image-size": {
    scope: BUILD,
    via: "@expo/metro -> metro",
    note: "Reads asset dimensions while bundling. Not bundled.",
  },
  "js-yaml": {
    scope: BUILD,
    via: "babel-jest -> babel-plugin-istanbul",
    note: "Coverage config parsing. Not bundled.",
  },
  "brace-expansion": {
    scope: BUILD,
    via: "babel-jest -> babel-plugin-istanbul -> test-exclude",
    note: "Glob expansion for coverage. Not bundled.",
  },
  "decode-uri-component": {
    scope: RUNTIME,
    via: "@react-navigation/core -> query-string",
    note:
      "Ships in the bundle. The advisory needs malformed percent-encoded input " +
      "to reach the decoder; this app registers no URL scheme, no `linking` " +
      "config and no Linking listener, so no external URL is parsed. " +
      "RE-REVIEW THIS the moment deep links are added.",
  },
};

function runAudit() {
  const options = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };

  // Node refuses to spawn the npm.cmd shim directly on Windows, so the command
  // goes through the shell as a single string there. Every token is a fixed
  // literal, so there is nothing to escape.
  const result =
    process.platform === "win32"
      ? spawnSync("npm audit --omit=dev --json", { ...options, shell: true })
      : spawnSync("npm", ["audit", "--omit=dev", "--json"], options);

  if (result.error) throw result.error;

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      "npm audit did not return JSON:\n" + (result.stderr || result.stdout),
    );
  }
}

function main() {
  const report = runAudit();
  const vulnerabilities = report.vulnerabilities || {};

  const unreviewed = [];
  const critical = [];
  const shipped = [];
  const accepted = [];

  for (const [name, entry] of Object.entries(vulnerabilities)) {
    // Skip packages that only appear as a carrier for a child advisory.
    const hasOwnAdvisory = (entry.via || []).some(
      (item) => typeof item === "object",
    );
    if (!hasOwnAdvisory) continue;

    const reviewed = REVIEWED[name];
    const severity = entry.severity;

    if (!reviewed) {
      unreviewed.push({ name, severity });
      continue;
    }

    if (severity === "critical") {
      critical.push({ name, severity, ...reviewed });
      continue;
    }

    if (reviewed.scope === RUNTIME && severity === "high") {
      shipped.push({ name, severity, ...reviewed });
      continue;
    }

    accepted.push({ name, severity, ...reviewed });
  }

  const runtimeAccepted = accepted.filter((item) => item.scope === RUNTIME);
  const buildAccepted = accepted.filter((item) => item.scope === BUILD);

  console.log("Production dependency audit\n");
  console.log(
    `  build-time only : ${buildAccepted.length} (not shipped in the bundle)`,
  );
  for (const item of buildAccepted) {
    console.log(`      - ${item.name} [${item.severity}] via ${item.via}`);
  }

  console.log(`\n  shipped in bundle: ${runtimeAccepted.length}`);
  for (const item of runtimeAccepted) {
    console.log(`      - ${item.name} [${item.severity}] via ${item.via}`);
    console.log(`        ${item.note}`);
  }

  const blockers = [...unreviewed, ...critical, ...shipped];
  if (blockers.length === 0) {
    console.log("\nOK: no unreviewed, critical or high-severity shipped advisories.");
    return;
  }

  console.error("\nRELEASE BLOCKED\n");
  for (const item of unreviewed) {
    console.error(`  UNREVIEWED  ${item.name} [${item.severity}]`);
    console.error(
      `              run: npm ls ${item.name} --omit=dev --all, then review it in scripts/audit-production.cjs`,
    );
  }
  for (const item of critical) {
    console.error(`  CRITICAL    ${item.name} via ${item.via}`);
  }
  for (const item of shipped) {
    console.error(
      `  HIGH/SHIPPED ${item.name} via ${item.via} — reaches the bundle`,
    );
  }
  process.exitCode = 1;
}

main();
