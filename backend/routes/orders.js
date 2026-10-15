import { Router } from "express";
import { query, tx } from "../db/pool.js";
import {
  ABORTABLE, CHANNELS, CUSTOMER_CANCELLABLE, DEFAULT_BRANCH, HANDOVER, HttpError, INSTRUCTION_LIMIT,
  advanceBlockReason, nextStatus, suggestPrice,
} from "../domain.js";
import { orderOut } from "../serialize.js";
import { oneOf, parseDataUrl, requireText, requireUuid } from "../validate.js";

const router = Router();
const actorOf = (req) => String(req.get("x-actor") ?? "system").slice(0, 60);

async function logEvent(client, orderId, event, from, to, actor) {
  await client.query(
    "insert into order_events (order_id, event, from_value, to_value, actor) values ($1,$2,$3,$4,$5)",
    [orderId, event, from, to, actor]);
}

async function lockOrder(client, id) {
  const { rows } = await client.query("select * from orders where id = $1 for update", [id]);
  if (!rows[0]) throw new HttpError(404, "Order not found");
  return rows[0];
}

async function itemsFor(client, orderIds) {
  if (!orderIds.length) return new Map();
  const { rows } = await client.query(
    "select * from order_items where order_id = any($1) order by order_id, position", [orderIds]);
  const map = new Map();
  for (const r of rows) (map.get(r.order_id) ?? map.set(r.order_id, []).get(r.order_id)).push(r);
  return map;
}

async function respond(res, row, status = 200, client = { query }) {
  const items = (await itemsFor(client, [row.id])).get(row.id) ?? [];
  res.status(status).json(orderOut(row, items));
}

// GET /api/orders?status=&customerId=&riderId=&pickupDate=  — oldest first (FIFO, FR-3.2)
router.get("/", async (req, res) => {
  const where = [];
  const vals = [];
  for (const [param, col] of [["status", "status"], ["customerId", "customer_id"], ["riderId", "rider_id"], ["pickupDate", "pickup_date"]]) {
    if (req.query[param]) { vals.push(req.query[param]); where.push(`${col} = $${vals.length}`); }
  }
  const { rows } = await query(
    `select * from orders ${where.length ? "where " + where.join(" and ") : ""} order by created_at asc`, vals);
  const items = await itemsFor({ query }, rows.map((r) => r.id));
  res.json(rows.map((r) => orderOut(r, items.get(r.id) ?? [])));
});

router.get("/:id", async (req, res) => {
  const { rows } = await query("select * from orders where id = $1", [req.params.id]);
  if (!rows[0]) throw new HttpError(404, "Order not found");
  const items = (await itemsFor({ query }, [rows[0].id])).get(rows[0].id) ?? [];
  const events = await query("select * from order_events where order_id = $1 order by created_at, id", [rows[0].id]);
  res.json({
    ...orderOut(rows[0], items),
    events: events.rows.map((e) => ({
      event: e.event, from: e.from_value, to: e.to_value, actor: e.actor, at: e.created_at.toISOString(),
    })),
  });
});

// POST /api/orders — new pick-up request (FR-2.1/2.2). The id (TEL-MMDDYY-XXXX) is issued by the database.
router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const customerId = requireUuid(b.customerId, "customerId");
  const packages = Array.isArray(b.packages) ? b.packages : [];
  if (!packages.length) throw new HttpError(400, "At least one package is required");
  for (const p of packages) {
    oneOf(p?.id, ["Premium", "Deluxe"], "packages[].id");
    if (String(p.instruction ?? "").length > INSTRUCTION_LIMIT) {
      throw new HttpError(400, `Special instruction is limited to ${INSTRUCTION_LIMIT} characters`);
    }
  }
  const pickupDate = requireText(b.pickupDate, "pickupDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) throw new HttpError(400, "pickupDate must be YYYY-MM-DD");

  const row = await tx(async (client) => {
    const c = (await client.query("select id from customers where id = $1", [customerId])).rows[0];
    if (!c) throw new HttpError(400, "Unknown customer");
    const handover = oneOf(b.handover, Object.values(HANDOVER), "handover");
    const { rows } = await client.query(
      `insert into orders (branch_id, customer_id, handover, channel, payment_method, pickup_date, pickup_slot, notes, bag_photo)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [
        DEFAULT_BRANCH, customerId, handover,
        oneOf(b.channel ?? "App", CHANNELS, "channel"),
        oneOf(b.paymentMethod ?? "Cash", ["Cash", "GCash"], "paymentMethod"),
        pickupDate, requireText(b.pickupSlot, "pickupSlot"),
        String(b.notes ?? "").trim(),
        b.bagPhoto ? parseDataUrl(b.bagPhoto, "bagPhoto") : null,
      ]);
    for (const [i, p] of packages.entries()) {
      await client.query("insert into order_items (order_id, position, package, instruction) values ($1,$2,$3,$4)",
        [rows[0].id, i + 1, p.id, String(p.instruction ?? "").trim()]);
    }
    await logEvent(client, rows[0].id, "created", null, "New Request", actorOf(req));
    return rows[0];
  });
  await respond(res, row, 201);
});

// PATCH /api/orders/:id {price?, notes?} — rider/attendant sets the final amount, staff add notes
router.patch("/:id", async (req, res) => {
  const b = req.body ?? {};
  const sets = [];
  const vals = [];
  if (b.price !== undefined) {
    const price = Number(b.price);
    if (!(price >= 0)) throw new HttpError(400, "price must be zero or more");
    vals.push(price); sets.push(`price = ${vals.length}`);
  }
  if (b.notes !== undefined) { vals.push(String(b.notes).trim()); sets.push(`notes = ${vals.length}`); }
  if (!sets.length) throw new HttpError(400, "Nothing to update");
  vals.push(req.params.id);
  const { rows } = await query(`update orders set ${sets.join(", ")} where id = ${vals.length} returning *`, vals);
  if (!rows[0]) throw new HttpError(404, "Order not found");
  await respond(res, rows[0]);
});

// POST /api/orders/:id/assign {riderId} (FR-2.3)
router.post("/:id/assign", async (req, res) => {
  const riderId = requireUuid(req.body?.riderId, "riderId");
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    const rider = (await client.query("select id from staff where id = $1 and role = 'rider' and active", [riderId])).rows[0];
    if (!rider) throw new HttpError(400, "Unknown or inactive rider");
    if (["Completed", "Cancelled"].includes(o.status)) throw new HttpError(409, `Cannot assign a ${o.status} order`);
    const status = o.status === "New Request" ? "Assigned for Pickup" : o.status;
    const { rows } = await client.query("update orders set rider_id = $1, status = $2 where id = $3 returning *", [riderId, status, o.id]);
    await logEvent(client, o.id, "rider_assigned", o.rider_id, riderId, actorOf(req));
    if (status !== o.status) await logEvent(client, o.id, "status_change", o.status, status, actorOf(req));
    return rows[0];
  });
  await respond(res, row);
});

// POST /api/orders/:id/advance {weightKg?, price?} — next status, enforcing the gates.
// Weighing happens at "Picked Up"; if only the weight is sent, the bill is suggested from it.
router.post("/:id/advance", async (req, res) => {
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    const items = (await itemsFor(client, [o.id])).get(o.id) ?? [];
    let weight = o.weight_kg;
    let price = o.price;
    if (req.body?.weightKg !== undefined) {
      weight = Number(req.body.weightKg);
      if (!(weight > 0)) throw new HttpError(400, "weightKg must be a positive number");
      price = suggestPrice(items.map((i) => i.package), weight);
    }
    if (req.body?.price !== undefined) {
      price = Number(req.body.price);
      if (!(price >= 0)) throw new HttpError(400, "price must be zero or more");
    }
    const next = nextStatus(o.status);
    if (!next) throw new HttpError(409, `Order is already ${o.status}`);
    const blocked = advanceBlockReason({
      status: o.status, handover: o.handover, weightKg: weight, paymentStatus: o.payment_status,
    });
    if (blocked) throw new HttpError(409, blocked);

    const { rows } = await client.query(
      "update orders set status = $1, weight_kg = $2, price = $3 where id = $4 returning *",
      [next, weight, price, o.id]);
    await logEvent(client, o.id, "status_change", o.status, next, actorOf(req));
    return rows[0];
  });
  await respond(res, row);
});

// POST /api/orders/:id/cancel — customer cancels before a rider is dispatched
router.post("/:id/cancel", async (req, res) => {
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    if (!CUSTOMER_CANCELLABLE.includes(o.status)) throw new HttpError(409, `Cannot cancel an order that is ${o.status}`);
    const { rows } = await client.query(
      "update orders set status = 'Cancelled', rider_id = null, cancel_reason = 'Cancelled by customer' where id = $1 returning *", [o.id]);
    await logEvent(client, o.id, "status_change", o.status, "Cancelled", actorOf(req));
    return rows[0];
  });
  await respond(res, row);
});

// POST /api/orders/:id/abort {reason} — staff abort of an in-progress order, reason required
router.post("/:id/abort", async (req, res) => {
  const reason = requireText(req.body?.reason, "reason");
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    if (!ABORTABLE.includes(o.status)) throw new HttpError(409, `Cannot abort an order that is ${o.status}`);
    const { rows } = await client.query(
      "update orders set status = 'Cancelled', rider_id = null, cancel_reason = $1 where id = $2 returning *", [reason, o.id]);
    await logEvent(client, o.id, "status_change", o.status, "Cancelled", actorOf(req));
    return rows[0];
  });
  await respond(res, row);
});

// POST /api/orders/:id/return {reason} — rider could not complete the handover and will come back
router.post("/:id/return", async (req, res) => {
  const reason = requireText(req.body?.reason, "reason");
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    if (!["Assigned for Pickup", "Out for Delivery"].includes(o.status)) {
      throw new HttpError(409, `Cannot mark a return while the order is ${o.status}`);
    }
    const { rows } = await client.query(
      "update orders set status = 'Rider Will Return', return_reason = $1 where id = $2 returning *", [reason, o.id]);
    await logEvent(client, o.id, "status_change", o.status, "Rider Will Return", actorOf(req));
    return rows[0];
  });
  await respond(res, row);
});

// POST /api/orders/:id/resume — put a returned order back on the rider's list
router.post("/:id/resume", async (req, res) => {
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    if (o.status !== "Rider Will Return") throw new HttpError(409, "Order is not waiting for a return visit");
    const { rows } = await client.query(
      "update orders set status = 'Assigned for Pickup', return_reason = null where id = $1 returning *", [o.id]);
    await logEvent(client, o.id, "status_change", o.status, "Assigned for Pickup", actorOf(req));
    return rows[0];
  });
  await respond(res, row);
});

// POST /api/orders/:id/payment {method, gcashRef?, receiptUrl?}
// Rider logs cash / GCash (FR-5.1/5.2) or the customer uploads a GCash receipt for a lobby order.
router.post("/:id/payment", async (req, res) => {
  const method = oneOf(req.body?.method, ["Cash", "GCash"], "method");
  const ref = method === "GCash" && req.body?.gcashRef ? String(req.body.gcashRef) : null;
  if (ref && !/^\d{4}$/.test(ref)) throw new HttpError(400, "gcashRef must be the last 4 digits");
  const receipt = req.body?.receiptUrl ? parseDataUrl(req.body.receiptUrl, "receiptUrl") : null;
  if (method === "GCash" && !ref && !receipt) throw new HttpError(400, "GCash needs the last 4 digits of the reference or a receipt");
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    if (o.payment_status === "Verified") throw new HttpError(409, "Payment is already verified");
    if (["New Request", "Assigned for Pickup", "Picked Up", "Cancelled"].includes(o.status)) {
      throw new HttpError(409, `Cannot log a payment while the order is ${o.status}`);
    }
    const { rows } = await client.query(
      `update orders set payment_method = $1, gcash_ref = $2, receipt_photo = coalesce($3, receipt_photo),
         payment_status = 'Pending Verification', payment_logged_at = now(),
         reject_reason = null, shortage = null, verified_at = null, verified_by = null
       where id = $4 returning *`,
      [method, ref, receipt, o.id]);
    await logEvent(client, o.id, "payment_logged", o.payment_status, `${method}${ref ? " •••" + ref : ""}`, actorOf(req));
    return rows[0];
  });
  await respond(res, row);
});

// Verification outcomes: verify, reject a cash amount (shortage) or reject a GCash receipt.
async function decidePayment(req, res, apply) {
  const row = await tx(async (client) => {
    const o = await lockOrder(client, req.params.id);
    if (o.payment_status !== "Pending Verification") throw new HttpError(409, "No payment is pending verification");
    const patch = apply(o, req.body ?? {});
    const cols = Object.keys(patch);
    const { rows } = await client.query(
      `update orders set ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}, verified_at = now(), verified_by = $${cols.length + 1}
       where id = $${cols.length + 2} returning *`,
      [...cols.map((c) => patch[c]), actorOf(req), o.id]);
    await logEvent(client, o.id, "payment_decision", o.payment_status, patch.payment_status, actorOf(req));
    if (patch.status && patch.status !== o.status) await logEvent(client, o.id, "status_change", o.status, patch.status, actorOf(req));
    return rows[0];
  });
  await respond(res, row);
}

// Any authorised staff can verify (FR-5.3). Completes the order if it is waiting on this.
router.post("/:id/verify-payment", (req, res) =>
  decidePayment(req, res, (o) => ({
    payment_status: "Verified", shortage: null, reject_reason: null,
    ...(o.status === "Payment Verification" ? { status: "Completed" } : {}),
  })));

router.post("/:id/reject-cash", (req, res) =>
  decidePayment(req, res, (_o, body) => {
    const shortage = Number(body.shortage);
    if (!(shortage > 0)) throw new HttpError(400, "shortage must be a positive amount");
    return { payment_status: "Shortage Logged", shortage };
  }));

router.post("/:id/reject-receipt", (req, res) =>
  decidePayment(req, res, (_o, body) => ({
    payment_status: "Awaiting Re-upload", reject_reason: requireText(body.reason, "reason"),
  })));

// PUT /api/orders/:id/delay {reason, eta} · POST …/delay/notified · DELETE …/delay  (FR-3.3, FR-4.4)
router.put("/:id/delay", async (req, res) => {
  const reason = requireText(req.body?.reason, "reason");
  const eta = String(req.body?.eta ?? "").trim() || null;
  const { rows } = await query(
    `update orders set delay_reason = $1, delay_eta = $2, delay_notified = false
     where id = $3 and status not in ('Completed', 'Cancelled') returning *`,
    [reason, eta, req.params.id]);
  if (!rows[0]) throw new HttpError(404, "Order not found or already closed");
  await respond(res, rows[0]);
});

router.post("/:id/delay/notified", async (req, res) => {
  const { rows } = await query(
    "update orders set delay_notified = true where id = $1 and delay_reason is not null returning *", [req.params.id]);
  if (!rows[0]) throw new HttpError(404, "Order has no delay recorded");
  await respond(res, rows[0]);
});

router.delete("/:id/delay", async (req, res) => {
  const { rows } = await query(
    `update orders set delay_reason = null, delay_eta = null, delay_notified = false
     where id = $1 returning *`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, "Order not found");
  await respond(res, rows[0]);
});

// PUT /api/orders/:id/photos/:kind {dataUrl} — bag | ref | proof | receipt
const PHOTO_COLUMN = { bag: "bag_photo", ref: "ref_photo", proof: "proof_photo", receipt: "receipt_photo" };
router.put("/:id/photos/:kind", async (req, res) => {
  const kind = oneOf(req.params.kind, Object.keys(PHOTO_COLUMN), "kind");
  const dataUrl = parseDataUrl(req.body?.dataUrl, "dataUrl");
  const { rows } = await query(
    `update orders set ${PHOTO_COLUMN[kind]} = $1 where id = $2 returning *`, [dataUrl, req.params.id]);
  if (!rows[0]) throw new HttpError(404, "Order not found");
  await respond(res, rows[0]);
});

export default router;
