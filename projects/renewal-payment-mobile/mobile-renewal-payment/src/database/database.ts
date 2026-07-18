import * as SQLite from "expo-sqlite";
import { migrations } from "./migrations";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync("renewal-payment.db");
  return databasePromise;
}

export async function migrateDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const applied = await db.getAllAsync<{ version: number }>("SELECT version FROM schema_migrations");
  const versions = new Set(applied.map((row) => row.version));
  for (const migration of migrations) {
    if (versions.has(migration.version)) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.runAsync("INSERT INTO schema_migrations(version) VALUES (?)", migration.version);
    });
  }
}
