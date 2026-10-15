// Usage: node db/seed.js [--reset]     (npm run db:seed / npm run db:reset)
// Loads demo data into Postgres. Refuses to run on a non-empty database unless --reset is passed
// (which wipes orders, customers, tickets and staff).
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { tx, getPool } from "./pool.js";
import { STAFF, CUSTOMERS, ORDERS, COMPLAINTS, ago } from "./seed-data.js";

const reset = process.argv.includes("--reset");
const at = (ms) => (ms ? new Date(ms) : null);
const scryptAsync = promisify(scrypt);

async function hashPin(pin) {
  const salt = randomBytes(16);
  const key = await scryptAsync(String(pin), salt, 32);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

const manilaParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
});
function manila(ms) {
  const p = Object.fromEntries(manilaParts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { mmddyy: `${p.month}${p.day}${p.year.slice(2)}`, dateKey: `${p.year}-${p.month}-${p.day}` };
}

try {
  await tx(async (c) => {
    const existing = (await c.query("select count(*)::int as n from customers")).rows[0].n;
    if (existing && !reset) {
      throw new Error("Database already has customers. Re-run with --reset to wipe and reseed.");
    }
    if (reset) {
      await c.query("truncate complaints, order_events, order_items, orders, customers, staff restart identity cascade");
      await c.query("alter sequence order_seq restart with 1000");
    }

    const staffIds = {};
    for (const s of STAFF) {
      staffIds[s.key] = (await c.query("insert into staff (name, role) values ($1,$2) returning id", [s.name, s.role])).rows[0].id;
    }

    const customerIds = {};
    for (const cu of CUSTOMERS) {
      customerIds[cu.key] = (await c.query(
        `insert into customers (first_name, last_name, contact, email, pin_hash, address, delivery_address, area, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [cu.firstName, cu.lastName, cu.contact, cu.email, await hashPin(cu.pin), cu.address, cu.deliveryAddress,
          cu.area, at(cu.createdTs)])).rows[0].id;
    }

    const orderIds = [];
    for (const [i, o] of ORDERS.entries()) {
      const createdTs = ago(o.hrs);
      const { mmddyy, dateKey } = manila(createdTs);
      const id = `TEL-${mmddyy}-${1001 + i}`;
      const verified = o.pay === "Verified";
      await c.query(
        `insert into orders (id, customer_id, status, weight_kg, price, handover, channel, rider_id,
           pickup_date, pickup_slot, delay_reason, delay_eta, delay_notified,
           payment_status, payment_method, gcash_ref, payment_logged_at, verified_at, verified_by, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [id, customerIds[o.cid], o.status, o.weight, o.price, o.handover, o.channel,
          o.rider ? staffIds[o.rider] : null, dateKey, o.slot,
          o.delay?.reason ?? null, o.delay?.eta ?? null, o.delay?.notified ?? false,
          o.pay, o.method, o.ref ?? null, o.payHrs ? at(ago(o.payHrs)) : null,
          verified ? at(ago(Math.max(1, (o.payHrs ?? o.hrs) - 2))) : null, verified ? "Owner" : null, at(createdTs)]);
      for (const [pos, pkg] of o.pkgs.entries()) {
        await c.query("insert into order_items (order_id, position, package, instruction) values ($1,$2,$3,'')", [id, pos + 1, pkg]);
      }
      orderIds.push(id);
    }
    // Keep the order-number sequence ahead of the explicitly seeded ids.
    await c.query("select setval('order_seq', $1)", [1000 + ORDERS.length]);

    for (const t of COMPLAINTS) {
      const created = at(ago(t.hrs));
      await c.query(
        `insert into complaints (order_id, kind, channel, message, status, assigned_to, response, created_at, resolved_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [orderIds[t.order], t.kind, t.channel, t.message, t.status, t.assignedTo ? staffIds[t.assignedTo] : null,
          t.response, created, t.status === "Resolved" ? created : null]);
    }

    console.log(`Seeded ${STAFF.length} staff, ${CUSTOMERS.length} customers, ${ORDERS.length} orders, ${COMPLAINTS.length} tickets.`);
  });
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await getPool().end();
}
