import { IS_API } from "../api.js";
import { STATUS_FLOW, PACKAGES, PACKAGE_PRICE, PACKAGE_NAME, HANDOVER, DELIVERED_STATUSES } from "../data/seedData.js";
import { formatAddress } from "./address.js";
import { mmddyy, formatLongDate, formatTime } from "./time.js";

export function nextStatus(status) {
  const i = STATUS_FLOW.indexOf(status);
  if (i === -1 || i === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}

export function personName(list, id) {
  const found = list.find((x) => x.id === id);
  return found ? found.name : "—";
}

export function ageHours(ts) {
  return ts ? (Date.now() - ts) / 3600000 : 0;
}

export function ageLabel(ts) {
  if (!ts) return "";
  const h = ageHours(ts);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h ago`;
}

// FIFO: oldest first.
export function byAge(a, b) {
  return (a.createdTs ?? 0) - (b.createdTs ?? 0);
}

// Every text input is stored in capitals so records are written consistently.
export const caps = (v) => (typeof v === "string" ? v.toUpperCase() : v);

// ---- packages -------------------------------------------------------------

export function packageNames(order) {
  return (order.packages || []).map((p) => PACKAGE_NAME[p.id] || p.id);
}

export function packagesLabel(order) {
  return packageNames(order).join(" + ") || "—";
}

// Sum of the per-load price of every package on the order.
export function packagesUnitPrice(order) {
  return (order.packages || []).reduce((sum, p) => sum + (PACKAGE_PRICE[p.id] || 0), 0);
}

export function packageById(id) {
  return PACKAGES.find((p) => p.id === id);
}

// Suggested bill when the load is weighed: one package is billed per 8kg load;
// several packages are each their own load, so they are simply added up.
export function suggestPrice(order, weight) {
  const w = Number(weight);
  if (!w || w <= 0) return null;
  const pkgs = order.packages || [];
  if (pkgs.length > 1) return packagesUnitPrice(order);
  return Math.ceil(w / 8) * packagesUnitPrice(order);
}

// ---- people / addresses ---------------------------------------------------

export const pickupAddressOf = (customer) => formatAddress(customer?.address);
export const deliveryAddressOf = (customer) => formatAddress(customer?.deliveryAddress || customer?.address);

// Route area for a customer: pickups group by pick-up subdivision/building,
// deliveries by the delivery address when one is on file.
export function routeArea(customer, forPickup) {
  if (!customer) return "Unknown area";
  const a = forPickup || !customer.deliveryAddress ? customer.address : customer.deliveryAddress;
  return a?.subdivision || a?.barangay || "Unknown area";
}

// ---- payments -------------------------------------------------------------

export function paymentInstruction(handover) {
  return handover === HANDOVER.LOBBY ? "Pay before delivery" : "Pay upon delivery";
}

// The ledger/customer wording for the payment method.
export function methodLabel(method) {
  return method === "GCash" ? "E-Wallet / Online Transfer" : method;
}

// "To be calculated" until a final amount exists, then "₱210 • Final • <payment text> • Cash".
export function paymentSummary(order) {
  if (order.price == null) return "To be calculated";
  let text;
  if (order.paymentStatus === "Verified") text = "Paid";
  else if (order.paymentStatus === "Pending Verification") text = "Payment being verified";
  else if (order.paymentStatus === "Awaiting Re-upload") text = "Receipt rejected — please re-upload";
  else if (order.paymentStatus === "Shortage Logged") text = `Short ₱${order.shortage ?? 0} — please settle the balance`;
  else text = paymentInstruction(order.handover);
  return `₱${order.price} • Final • ${text} • ${order.paymentMethod}`;
}

// Why an order can't move to its next status yet (null = free to advance).
export function advanceBlockReason(order) {
  if (order.status === "Ready for Delivery" && order.handover === HANDOVER.LOBBY && order.paymentStatus !== "Verified") {
    return "Leave-at-lobby orders are paid before delivery — payment must be verified first";
  }
  if (order.status === "Delivered" && ["Unpaid", "Shortage Logged", "Awaiting Re-upload"].includes(order.paymentStatus)) {
    return "Log the payment before sending for verification";
  }
  if (order.status === "Payment Verification" && order.paymentStatus !== "Verified") {
    return "Payment must be verified first";
  }
  if (order.status === "Picked Up" && !order.weight) {
    return "Attendant must weigh the load first";
  }
  return null;
}

// ---- ids ------------------------------------------------------------------

// Time-based prefix + random suffix: unique across sessions without a server counter.
let idCounter = 0;
export function newId(prefix) {
  idCounter = (idCounter + 1) % 1296;
  return prefix + Date.now().toString(36).slice(-5) + idCounter.toString(36).padStart(2, "0") + Math.random().toString(36).slice(2, 4);
}

// Customer ids: a real UUID in api mode (the database key), a short local id in prototype mode.
export function newCustomerId() {
  return IS_API ? crypto.randomUUID() : newId("c");
}

// TEL-MMDDYY-XXXX. XXXX is one continuous counter (never resets daily), starting at 1000 and
// growing to 5+ digits. It is derived from the highest sequence already issued and assigned
// synchronously, so two requests can never receive the same number. On the real backend this
// must be a database sequence / atomic increment.
export function nextOrderId(orders, ts = Date.now()) {
  const max = orders.reduce((m, o) => {
    const n = parseInt(String(o.id).split("-")[2], 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 999);
  return `TEL-${mmddyy(ts)}-${max + 1}`;
}

// ---- display --------------------------------------------------------------

export const orderDateLabel = (o) => formatLongDate(o.createdTs);
export const orderTimeLabel = (o) => formatTime(o.createdTs);

export function isDelivered(order) {
  return DELIVERED_STATUSES.includes(order.status);
}
