import "dotenv/config";

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createPool } from "./client.js";

export const migrate = async (): Promise<void> => {
  const pool = createPool();
  const migrationsDirectory = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../migrations",
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const filename of files) {
    const applied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [filename],
    );
    if (applied.rowCount) continue;
    const sql = await readFile(join(migrationsDirectory, filename), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [filename],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  await pool.end();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrate();
  console.log("Database migrations applied");
}
