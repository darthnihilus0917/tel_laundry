import { createApp } from "./app.js";
import { query } from "./db/pool.js";

const port = Number(process.env.PORT ?? 3001);

try {
  await query("select 1");
} catch (err) {
  console.error(`Cannot reach the database: ${err.message}`);
  console.error("Check DATABASE_URL in .env, then run: npm run db:migrate");
  process.exit(1);
}

createApp().listen(port, () => console.log(`TEL Laundry API listening on http://localhost:${port}`));
