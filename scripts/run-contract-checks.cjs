const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((name) => name.startsWith("check-") && name.endsWith(".cjs"))
  .sort();

for (const name of files) {
  console.log(`\n▶ scripts/${name}`);
  const result = spawnSync(process.execPath, [path.join(dir, name)], {
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\n✓ ${files.length} contract checks passed`);
