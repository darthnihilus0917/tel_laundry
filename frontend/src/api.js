// Data mode switch.
//   prototype — sample data kept in the browser's localStorage. No network calls at all; this is the build
//               that is deployed to Netlify for the client to click through.
//   api       — the Express/PostgreSQL backend in ../backend (requests go to VITE_API_URL, default "/api",
//               which the Vite dev server proxies to http://localhost:3001).
// Choose with `npm run dev` / `npm run dev:api` (or `build:prototype` / `build:api`).

export const MODE = import.meta.env.VITE_DATA_MODE === "api" ? "api" : "prototype";
export const IS_API = MODE === "api";

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body, actor) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "content-type": "application/json", ...(actor ? { "x-actor": actor } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  return data;
}

// ---- adapters: API shapes -> the shapes the UI components already use ---------------------------

const ts = (iso) => (iso ? Date.parse(iso) : null);

export function customerFromApi(c) {
  return { ...c, createdTs: ts(c.createdAt) };
}

export function orderFromApi(o) {
  return {
    ...o,
    weight: o.weightKg,
    createdTs: ts(o.createdAt),
    paymentTs: ts(o.paymentLoggedAt),
    verifiedTs: ts(o.verifiedAt),
    proofPhoto: Boolean(o.proofPhotoUrl),
  };
}

export function complaintFromApi(t) {
  return { ...t, createdTs: ts(t.createdAt) };
}

// ---- endpoints ----------------------------------------------------------------------------------

export const api = {
  async loadAll() {
    const [staff, customers, orders, complaints] = await Promise.all([
      request("GET", "/staff"),
      request("GET", "/customers"),
      request("GET", "/orders"),
      request("GET", "/complaints"),
    ]);
    return {
      staff,
      customers: customers.map(customerFromApi),
      // The board is FIFO: oldest first, like the server returns it. The UI re-sorts as needed.
      orders: orders.map(orderFromApi),
      complaints: complaints.map(complaintFromApi),
    };
  },

  login: (contact, pin) => request("POST", "/customers/login", { contact, pin }).then(customerFromApi),
  createCustomer: (body) => request("POST", "/customers", body).then(customerFromApi),
  updateCustomer: (id, patch) => request("PATCH", `/customers/${id}`, patch).then(customerFromApi),

  createOrder: (body, actor) => request("POST", "/orders", body, actor).then(orderFromApi),
  patchOrder: (id, patch, actor) => request("PATCH", `/orders/${id}`, patch, actor).then(orderFromApi),
  assign: (id, riderId, actor) => request("POST", `/orders/${id}/assign`, { riderId }, actor).then(orderFromApi),
  advance: (id, body, actor) => request("POST", `/orders/${id}/advance`, body, actor).then(orderFromApi),
  cancel: (id, actor) => request("POST", `/orders/${id}/cancel`, {}, actor).then(orderFromApi),
  abort: (id, reason, actor) => request("POST", `/orders/${id}/abort`, { reason }, actor).then(orderFromApi),
  returnVisit: (id, reason, actor) => request("POST", `/orders/${id}/return`, { reason }, actor).then(orderFromApi),
  resume: (id, actor) => request("POST", `/orders/${id}/resume`, {}, actor).then(orderFromApi),
  logPayment: (id, body, actor) => request("POST", `/orders/${id}/payment`, body, actor).then(orderFromApi),
  verifyPayment: (id, actor) => request("POST", `/orders/${id}/verify-payment`, {}, actor).then(orderFromApi),
  rejectCash: (id, shortage, actor) => request("POST", `/orders/${id}/reject-cash`, { shortage }, actor).then(orderFromApi),
  rejectReceipt: (id, reason, actor) => request("POST", `/orders/${id}/reject-receipt`, { reason }, actor).then(orderFromApi),
  setDelay: (id, delay, actor) => request("PUT", `/orders/${id}/delay`, { reason: delay.reason, eta: delay.eta }, actor).then(orderFromApi),
  delayNotified: (id, actor) => request("POST", `/orders/${id}/delay/notified`, {}, actor).then(orderFromApi),
  clearDelay: (id, actor) => request("DELETE", `/orders/${id}/delay`, undefined, actor).then(orderFromApi),
  putPhoto: (id, kind, dataUrl, actor) => request("PUT", `/orders/${id}/photos/${kind}`, { dataUrl }, actor).then(orderFromApi),

  createComplaint: (body) => request("POST", "/complaints", body).then(complaintFromApi),
  patchComplaint: (id, patch) => request("PATCH", `/complaints/${id}`, patch).then(complaintFromApi),
};

// Translates the UI's generic `updateOrder(id, patch)` into the specific API calls it stands for.
// Returns the last updated order (or null when the patch only touched UI-only fields).
export async function applyOrderPatch(order, patch, actor) {
  let latest = null;
  const photoKinds = { refPhoto: "ref", proofPhotoUrl: "proof", bagPhoto: "bag", receiptUrl: "receipt" };

  for (const [field, kind] of Object.entries(photoKinds)) {
    if (patch[field]) latest = await api.putPhoto(order.id, kind, patch[field], actor);
  }
  if ("delay" in patch) {
    const d = patch.delay;
    if (d === null) latest = await api.clearDelay(order.id, actor);
    else if (order.delay && d.notified && !order.delay.notified && d.reason === order.delay.reason) {
      latest = await api.delayNotified(order.id, actor);
    } else latest = await api.setDelay(order.id, d, actor);
  }
  if (patch.price !== undefined && patch.price !== order.price) {
    latest = await api.patchOrder(order.id, { price: patch.price }, actor);
  }
  if (patch.paymentStatus === "Pending Verification" && patch.paymentMethod) {
    latest = await api.logPayment(order.id, {
      method: patch.paymentMethod,
      ...(patch.gcashRef ? { gcashRef: patch.gcashRef } : {}),
    }, actor);
  }
  return latest;
}
