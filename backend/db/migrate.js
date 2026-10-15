// Usage: node server/db/migrate.js
// Creates the database if it doesn't exist (local dev), then applies any
// pending SQL files from server/db/migrations in filename order.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { connectionConfig } from "./pool.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

async function ensureDatabase(cfg) {
  const url = new URL(cfg.connectionString);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  // Hosted Postgres (Supabase) already has its database; only auto-create on localhost.
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) return;

  url.pathname = "/postgres";
  const admin = new pg.Client({ ...cfg, connectionString: url.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("select 1 from pg_database where datname = $1", [dbName]);
    if (!rowCount) {
      await admin.query(`create database "${dbName.replace(/"/g, '""')}"`);
      console.log(`Created database "${dbName}"`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  const cfg = connectionConfig();
  await ensureDatabase(cfg);

  const client = new pg.Client(cfg);
  await client.connect();
  try {
    await client.query(`create table if not exists schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      console.log(`Applying ${file}…`);
      await client.query("begin");
      try {
        await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
    console.log("Database is up to date.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
