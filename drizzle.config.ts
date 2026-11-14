import { defineConfig } from "drizzle-kit";

// The on-device database (expo-sqlite). `npx drizzle-kit generate` writes a
// new migration into ./drizzle after a change to the schema.
export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./src/modules/offline/db/schema.ts",
  out: "./drizzle",
});
