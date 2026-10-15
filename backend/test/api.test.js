// API smoke/regression tests. Run against a running server on a migrated + seeded database:
//   npm run db:migrate && npm run db:reset && npm start   (in another terminal)
//   npm test
// It creates its own customers/orders, so it only needs the seed staff to exist.
import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL ?? "http://localhost:3001";

async function api(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const get = (p) => api("GET", p);
const post = (p, b = {}) => api("POST", p, b);

const ADDRESS = { unit: "Blk 1 Lot 2", subdivision: "Test Village", barangay: "Test Brgy", city: "Quezon City" };
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const unique = () => String(Date.now()).slice(-8) + Math.floor(Math.random() * 90 + 10);

async function newCustomer(extra = {}) {
  const r = await post("/api/customers", {
    firstName: "Test", lastName: "Customer", contact: `09${unique()}`, email: `test.${unique()}@Example.com`,
    pin: "4321", address: ADDRESS, ...extra,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

async function newOrder(customerId, extra = {}) {
  const r = await post("/api/orders", {
    customerId, packages: [{ id: "Deluxe", instruction: "No fabric softener" }],
    handover: "Meet the Rider", channel: "Text", pickupDate: "2026-10-15", pickupSlot: "8:00 AM - 12:00 NN", ...extra,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

let rider;
test.before(async () => {
  const r = await get("/api/staff?role=rider");
  assert.equal(r.status, 200);
  rider = r.body[0];
  assert.ok(rider, "seed data must include a rider (npm run db:reset)");
});

test("health and staff", async () => {
  const h = await get("/api/health");
  assert.equal(h.status, 200);
  assert.equal(h.body.ok, true);
});

test("customers: create, validate, duplicate contact, lookup, PIN login", async () => {
  const c = await newCustomer();
  assert.equal(c.name, "TEST CUSTOMER");
  assert.equal(c.address.subdivision, "TEST VILLAGE");
  assert.equal(c.area, "TEST VILLAGE");
  assert.equal("pin" in c || "pinHash" in c, false, "PIN must never be returned");

  const dup = await post("/api/customers", { firstName: "A", lastName: "B", contact: c.contact, address: ADDRESS });
  assert.equal(dup.status, 409);

  const bad = await post("/api/customers", { firstName: "A", lastName: "B", contact: "0900", address: { unit: "x" } });
  assert.equal(bad.status, 400);

  const found = await get(`/api/customers?q=${encodeURIComponent(c.contact)}`);
  assert.equal(found.body.length, 1);

  assert.equal(c.email, c.email.toLowerCase(), "emails are stored lower-case");
  assert.equal((await post("/api/customers/login", { email: c.email.toUpperCase(), pin: "4321" })).status, 200);
  assert.equal((await post("/api/customers/login", { email: c.email, pin: "0000" })).status, 401);
  assert.equal((await post("/api/customers/login", { email: "nobody@example.com", pin: "4321" })).status, 401);
  assert.equal((await post("/api/customers/login", { pin: "4321" })).status, 400);

  const dupEmail = await post("/api/customers", {
    firstName: "A", lastName: "B", contact: `09${unique()}`, email: c.email.toUpperCase(), address: ADDRESS,
  });
  assert.equal(dupEmail.status, 409);
  assert.equal((await post("/api/customers", {
    firstName: "A", lastName: "B", contact: `09${unique()}`, email: "not-an-email", address: ADDRESS,
  })).status, 400);

  // Google-registered customers have no PIN and cannot log in with one
  const g = await newCustomer({ authProvider: "google", pin: undefined, email: `g.${unique()}@gmail.com` });
  assert.equal(g.authProvider, "google");
  assert.equal((await post("/api/customers/login", { email: g.email, pin: "1234" })).status, 401);
});

test("order ids are TEL-MMDDYY-XXXX and strictly increasing", async () => {
  const c = await newCustomer();
  const a = await newOrder(c.id);
  const b = await newOrder(c.id);
  assert.match(a.id, /^TEL-\d{6}-\d{4,}$/);
  const seq = (o) => parseInt(o.id.split("-")[2], 10);
  assert.ok(seq(b) > seq(a));
  assert.equal(a.status, "New Request");
});

test("order validation", async () => {
  const c = await newCustomer();
  const base = { customerId: c.id, handover: "Meet the Rider", pickupDate: "2026-10-15", pickupSlot: "8:00 AM - 12:00 NN" };
  assert.equal((await post("/api/orders", { ...base, packages: [] })).status, 400);
  assert.equal((await post("/api/orders", { ...base, packages: [{ id: "Gold" }] })).status, 400);
  assert.equal((await post("/api/orders", { ...base, packages: [{ id: "Deluxe", instruction: "x".repeat(151) }] })).status, 400);
  assert.equal((await post("/api/orders", { ...base, packages: [{ id: "Deluxe" }], handover: "Teleport" })).status, 400);
  assert.equal((await post("/api/orders", { ...base, customerId: "not-a-uuid", packages: [{ id: "Deluxe" }] })).status, 400);
});

test("lobby order: must be paid and verified before delivery, then completes", async () => {
  const c = await newCustomer();
  const o = await newOrder(c.id, {
    handover: "Leave at Lobby", paymentMethod: "GCash",
    packages: [{ id: "Premium", instruction: "" }, { id: "Deluxe", instruction: "" }],
  });

  assert.equal((await post(`/api/orders/${o.id}/assign`, { riderId: rider.id })).body.status, "Assigned for Pickup");
  assert.equal((await post(`/api/orders/${o.id}/advance`)).body.status, "Picked Up");

  const unweighed = await post(`/api/orders/${o.id}/advance`);
  assert.equal(unweighed.status, 409);
  assert.match(unweighed.body.error, /weigh/);

  const weighed = await post(`/api/orders/${o.id}/advance`, { weightKg: 9 });
  assert.equal(weighed.body.status, "In Shop");
  assert.equal(weighed.body.price, 445, "two packages are each their own load");

  assert.equal((await post(`/api/orders/${o.id}/advance`)).body.status, "Ready for Delivery");
  const early = await post(`/api/orders/${o.id}/advance`);
  assert.equal(early.status, 409, "lobby orders are paid before delivery");

  // GCash needs a ref or a receipt; the receipt upload comes from the customer
  assert.equal((await post(`/api/orders/${o.id}/payment`, { method: "GCash" })).status, 400);
  const paid = await post(`/api/orders/${o.id}/payment`, { method: "GCash", receiptUrl: PNG, gcashRef: "4821" });
  assert.equal(paid.body.paymentStatus, "Pending Verification");

  // receipt rejected -> customer re-uploads -> verified
  const rejected = await post(`/api/orders/${o.id}/reject-receipt`, { reason: "Receipt is blurry or unreadable" });
  assert.equal(rejected.body.paymentStatus, "Awaiting Re-upload");
  assert.equal((await post(`/api/orders/${o.id}/advance`)).status, 409);
  await post(`/api/orders/${o.id}/payment`, { method: "GCash", receiptUrl: PNG, gcashRef: "4821" });
  const verified = await post(`/api/orders/${o.id}/verify-payment`, {});
  assert.equal(verified.body.paymentStatus, "Verified");

  for (const expected of ["Out for Delivery", "Delivered", "Payment Verification", "Completed"]) {
    assert.equal((await post(`/api/orders/${o.id}/advance`)).body.status, expected);
  }
  assert.equal((await post(`/api/orders/${o.id}/advance`)).status, 409, "completed is terminal");

  const detail = await get(`/api/orders/${o.id}`);
  assert.ok(detail.body.events.length >= 8, "every step is in the audit trail");
  assert.equal(detail.body.packages.length, 2);
});

test("meet-the-rider cash order: shortage then verification completes it", async () => {
  const c = await newCustomer();
  const o = await newOrder(c.id);
  await post(`/api/orders/${o.id}/assign`, { riderId: rider.id });
  await post(`/api/orders/${o.id}/advance`);                                   // Picked Up
  const w = await post(`/api/orders/${o.id}/advance`, { weightKg: 6 });        // In Shop
  assert.equal(w.body.price, 210);
  await post(`/api/orders/${o.id}/advance`);                                   // Ready
  await post(`/api/orders/${o.id}/advance`);                                   // Out
  await post(`/api/orders/${o.id}/advance`);                                   // Delivered
  assert.equal((await post(`/api/orders/${o.id}/advance`)).status, 409, "unpaid cannot be sent for verification");

  await post(`/api/orders/${o.id}/payment`, { method: "Cash" });
  assert.equal((await post(`/api/orders/${o.id}/advance`)).body.status, "Payment Verification");

  assert.equal((await post(`/api/orders/${o.id}/reject-cash`, { shortage: 0 })).status, 400);
  const short = await post(`/api/orders/${o.id}/reject-cash`, { shortage: 20 });
  assert.equal(short.body.paymentStatus, "Shortage Logged");
  assert.equal(short.body.shortage, 20);

  await post(`/api/orders/${o.id}/payment`, { method: "Cash" });
  const done = await post(`/api/orders/${o.id}/verify-payment`, {});
  assert.equal(done.body.status, "Completed", "verifying completes an order waiting in Payment Verification");
  assert.equal(done.body.paymentStatus, "Verified");
});

test("return visit, cancel and abort rules", async () => {
  const c = await newCustomer();

  const a = await newOrder(c.id);
  await post(`/api/orders/${a.id}/assign`, { riderId: rider.id });
  assert.equal((await post(`/api/orders/${a.id}/return`, {})).status, 400, "reason required");
  const ret = await post(`/api/orders/${a.id}/return`, { reason: "Tried calling, but no answer" });
  assert.equal(ret.body.status, "Rider Will Return");
  assert.equal((await post(`/api/orders/${a.id}/resume`)).body.status, "Assigned for Pickup");

  assert.equal((await post(`/api/orders/${a.id}/cancel`)).status, 409, "customer cannot cancel once a rider is dispatched");
  assert.equal((await post(`/api/orders/${a.id}/abort`, {})).status, 400, "abort needs a reason");
  const aborted = await post(`/api/orders/${a.id}/abort`, { reason: "Duplicate booking" });
  assert.equal(aborted.body.status, "Cancelled");
  assert.equal(aborted.body.riderId, null);

  const b = await newOrder(c.id);
  assert.equal((await post(`/api/orders/${b.id}/cancel`)).body.cancelReason, "Cancelled by customer");
});

test("delay flow and photos", async () => {
  const c = await newCustomer();
  const o = await newOrder(c.id);

  const d = await api("PUT", `/api/orders/${o.id}/delay`, { reason: "Machine volume", eta: "Tomorrow, 10:00 AM" });
  assert.deepEqual(d.body.delay, { reason: "Machine volume", eta: "Tomorrow, 10:00 AM", notified: false });
  assert.equal((await post(`/api/orders/${o.id}/delay/notified`)).body.delay.notified, true);
  assert.equal((await api("DELETE", `/api/orders/${o.id}/delay`)).body.delay, null);

  const p = await api("PUT", `/api/orders/${o.id}/photos/proof`, { dataUrl: PNG });
  assert.equal(p.body.proofPhotoUrl, PNG);
  assert.equal((await api("PUT", `/api/orders/${o.id}/photos/proof`, { dataUrl: "http://x/y.png" })).status, 400);
  assert.equal((await api("PUT", `/api/orders/${o.id}/photos/selfie`, { dataUrl: PNG })).status, 400);
});

test("complaints: ticket lifecycle", async () => {
  const c = await newCustomer();
  const o = await newOrder(c.id);

  assert.equal((await post("/api/complaints", { orderId: "TEL-000000-0000", message: "x" })).status, 400);
  const t = await post("/api/complaints", { orderId: o.id, kind: "Issue", message: "Missing a sock", photos: [PNG] });
  assert.equal(t.status, 201);
  assert.equal(t.body.status, "Open");
  assert.equal(t.body.photos.length, 1);

  assert.equal((await api("PATCH", `/api/complaints/${t.body.id}`, { status: "In Progress" })).status, 400, "must be assigned first");
  const assigned = await api("PATCH", `/api/complaints/${t.body.id}`, { assignedTo: rider.id });
  assert.equal(assigned.body.status, "In Progress");
  const upd = await api("PATCH", `/api/complaints/${t.body.id}`, { response: "Looking for it" });
  assert.equal(upd.body.response, "Looking for it");
  assert.equal((await api("PATCH", `/api/complaints/${t.body.id}`, { status: "Resolved", response: "" })).status, 400);
  const resolved = await api("PATCH", `/api/complaints/${t.body.id}`, { status: "Resolved", response: "Found it" });
  assert.equal(resolved.body.status, "Resolved");
  assert.ok(resolved.body.resolvedAt);
});

test("dashboard, maintenance and error handling", async () => {
  const d = await get("/api/dashboard");
  assert.equal(d.status, 200);
  assert.ok(Array.isArray(d.body.exceptions));
  assert.equal(typeof d.body.pendingPickups, "number");

  assert.equal((await post("/api/maintenance/purge-photos")).status, 200);
  assert.equal((await get("/api/orders/TEL-000000-0000")).status, 404);
  assert.equal((await get("/api/customers/not-a-uuid")).status, 400);
  assert.equal((await get("/api/nope")).status, 404);
});
