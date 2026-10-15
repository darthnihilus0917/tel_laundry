import pg from "pg";

// Load .env if present (Node 20.12+). Real environment variables win.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch { /* no .env file — rely on the environment */ }

// Postgres numeric/bigint come back as strings by default; this app's values fit in JS numbers.
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // numeric
pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint

export function connectionConfig() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill in your local Postgres credentials.");
  }
  // Supabase requires TLS; local Postgres does not.
  const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;
  return { connectionString: url, ssl };
}

let pool;
export function getPool() {
  if (!pool) pool = new pg.Pool({ ...connectionConfig(), max: 10 });
  return pool;
}

export const query = (text, params) => getPool().query(text, params);

// Runs fn inside a transaction on a single client.
export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
