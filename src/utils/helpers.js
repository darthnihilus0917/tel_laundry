import { STATUS_FLOW } from "../data/seedData.js";

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

// Area for route grouping — the last comma-separated part of the address
// (e.g. "Unit 12B, Sunrise Condo Lobby" -> "Sunrise Condo Lobby").
export function areaOf(address) {
  if (!address) return "Unknown area";
  const parts = address.split(",");
  return parts[parts.length - 1].trim() || "Unknown area";
}

// Price is per load (max MAX_LOAD_KG each): heavier bags are billed as multiple loads.
export function computePrice(weight, pkgPrice) {
  const w = Number(weight);
  if (!w || w <= 0) return null;
  return Math.ceil(w / 8) * pkgPrice;
}

// Why an order can't move to its next status yet (null = free to advance).
export function advanceBlockReason(order) {
  if (order.status === "Delivered" && order.paymentStatus === "Unpaid") {
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
