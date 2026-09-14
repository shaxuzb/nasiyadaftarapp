const { readdir } = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(full)));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }

  return files;
}

(async () => {
  const files = (await collect(path.resolve("src"))).sort();

  for (const file of files) {
    console.log(`\n▶ ${path.relative(process.cwd(), file)}`);
    await import(pathToFileURL(file).href);
  }

  console.log(`\n✓ ${files.length} test files passed`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
