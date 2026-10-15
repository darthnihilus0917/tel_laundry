import { Router } from "express";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "../db/pool.js";
import { DEFAULT_BRANCH, HttpError } from "../domain.js";
import { customerOut } from "../serialize.js";
import { parseAddress, parseEmail, requireText, requireUuid } from "../validate.js";

const scrypt = promisify(scryptCb);
const router = Router();

export async function hashPin(pin) {
  if (!/^\d{4}$/.test(String(pin ?? ""))) throw new HttpError(400, "pin must be 4 digits");
  const salt = randomBytes(16);
  const key = await scrypt(String(pin), salt, 32);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function pinMatches(pin, stored) {
  if (!stored) return false;
  const [saltHex, keyHex] = stored.split(":");
  const key = await scrypt(String(pin), Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// GET /api/customers?q=ana — lookup by name or contact (FR-1.1, FR-1.4)
router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const { rows } = q
    ? await query(
        `select * from customers
         where (first_name || ' ' || last_name) ilike $1 or contact ilike $1
         order by last_name, first_name limit 50`, [`%${q}%`])
    : await query("select * from customers order by last_name, first_name limit 500");
  res.json(rows.map(customerOut));
});

// POST /api/customers/login {email, pin} — customer app sign-in.
// Google accounts have no PIN and cannot use this endpoint (Google sign-in needs server-side ID-token
// verification, which is not set up yet — see backend/README.md).
router.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const contact = String(req.body?.contact ?? "").replace(/\s/g, ""); // older clients / records without an email
  if (!email && !contact) throw new HttpError(400, "email is required");
  const { rows } = email
    ? await query("select * from customers where lower(email) = $1 and branch_id = $2", [email, DEFAULT_BRANCH])
    : await query("select * from customers where replace(contact, ' ', '') = $1 and branch_id = $2", [contact, DEFAULT_BRANCH]);
  if (!rows[0] || !(await pinMatches(req.body?.pin, rows[0].pin_hash))) {
    throw new HttpError(401, "Email or PIN is incorrect");
  }
  res.json(customerOut(rows[0]));
});

router.get("/:id", async (req, res) => {
  const { rows } = await query("select * from customers where id = $1", [req.params.id]);
  if (!rows[0]) throw new HttpError(404, "Customer not found");
  res.json(customerOut(rows[0]));
});

router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const address = parseAddress(b.address, "address");
  const deliveryAddress = parseAddress(b.deliveryAddress, "deliveryAddress", { required: false });
  const { rows } = await query(
    `insert into customers (id, branch_id, first_name, last_name, contact, pin_hash, address, delivery_address, area, email, auth_provider)
     values (coalesce($9, gen_random_uuid()),$1,$2,$3,$4,$5,$6,$7,$8,$10,$11) returning *`,
    [
      DEFAULT_BRANCH,
      requireText(b.firstName, "firstName").toUpperCase(),
      requireText(b.lastName, "lastName").toUpperCase(),
      requireText(b.contact, "contact"),
      b.pin !== undefined ? await hashPin(b.pin) : null,
      address, deliveryAddress,
      String(b.area ?? "").trim().toUpperCase() || address.subdivision,
      b.id ? requireUuid(b.id, "id") : null, // optional client-generated id so the browser can reference the record immediately
      parseEmail(b.email),
      b.authProvider === "google" ? "google" : "email",
    ]).catch((err) => {
      if (err.code === "23505") {
        throw new HttpError(409, /email/.test(err.constraint ?? err.message)
          ? "A customer with this email already exists"
          : "A customer with this contact number already exists");
      }
      throw err;
    });
  res.status(201).json(customerOut(rows[0]));
});

router.patch("/:id", async (req, res) => {
  const b = req.body ?? {};
  const sets = [];
  const vals = [];
  const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (b.firstName !== undefined) add("first_name", requireText(b.firstName, "firstName").toUpperCase());
  if (b.lastName !== undefined) add("last_name", requireText(b.lastName, "lastName").toUpperCase());
  if (b.contact !== undefined) add("contact", requireText(b.contact, "contact"));
  if (b.email !== undefined) add("email", parseEmail(b.email));
  if (b.address !== undefined) add("address", parseAddress(b.address, "address"));
  if (b.deliveryAddress !== undefined) add("delivery_address", parseAddress(b.deliveryAddress, "deliveryAddress", { required: false }));
  if (b.area !== undefined) add("area", String(b.area).trim().toUpperCase() || null);
  if (b.pin !== undefined) add("pin_hash", await hashPin(b.pin));
  if (!sets.length) throw new HttpError(400, "Nothing to update");
  vals.push(req.params.id);
  const { rows } = await query(`update customers set ${sets.join(", ")} where id = $${vals.length} returning *`, vals);
  if (!rows[0]) throw new HttpError(404, "Customer not found");
  res.json(customerOut(rows[0]));
});

export default router;
