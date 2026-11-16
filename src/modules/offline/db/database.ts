import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import migrations from "../../../../drizzle/migrations";
import * as schema from "./schema";

const DATABASE_NAME = "qarzdaftar.db";
const KEY_STORAGE_KEY = "offline_database_key_v1";

export type OfflineDatabase = ExpoSQLiteDatabase<typeof schema>;

/**
 * The key the database is encrypted with (SQLCipher): random, made once per
 * install and kept in the device's secure store, never in the database's
 * folder. Hex, for SQLCipher's raw-key form.
 */
async function getDatabaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_STORAGE_KEY);
  if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;
  const bytes = Crypto.getRandomBytes(32);
  const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(KEY_STORAGE_KEY, key, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return key;
}

async function open(key: string): Promise<{ raw: SQLiteDatabase; db: OfflineDatabase }> {
  const raw = await openDatabaseAsync(DATABASE_NAME);
  try {
    // Before anything else touches the file.
    await raw.execAsync(`PRAGMA key = "x'${key}'"`);
    // Reading the schema fails here, not later, when the key is wrong.
    await raw.execAsync("SELECT count(*) FROM sqlite_master;");
    await raw.execAsync("PRAGMA journal_mode = WAL;");
    const db = drizzle(raw, { schema });
    await migrate(db, migrations);
    return { raw, db };
  } catch (error) {
    await raw.closeAsync().catch(() => undefined);
    throw error;
  }
}

async function openOrRecreate(): Promise<OfflineDatabase | null> {
  try {
    const key = await getDatabaseKey();
    try {
      return (await open(key)).db;
    } catch (error) {
      // Damaged, or written with a key this install no longer has. It only
      // holds a copy of what the server has, so it is started again.
      if (__DEV__) console.warn("Offline database could not be opened; recreating it", error);
      await deleteDatabaseAsync(DATABASE_NAME).catch(() => undefined);
      return (await open(key)).db;
    }
  } catch (error) {
    // Without it the app still works, just without its offline copy.
    if (__DEV__) console.warn("Offline database is unavailable", error);
    return null;
  }
}

let opening: Promise<OfflineDatabase | null> | null = null;

/** The database, opened once; null when the device cannot open it. */
export function getOfflineDatabase(): Promise<OfflineDatabase | null> {
  opening ??= openOrRecreate().then((db) => {
    // A failure is retried on the next call rather than remembered.
    if (!db) opening = null;
    return db;
  });
  return opening;
}
