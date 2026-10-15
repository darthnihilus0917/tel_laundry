// Business rules enforced server-side so the API cannot be bypassed.
// Mirrors the front-end prototype (frontend/src/data/seedData.js, frontend/src/utils/helpers.js).

export const MAX_LOAD_KG = 8;
export const DEFAULT_BRANCH = "main";
export const PACKAGE_PRICE = { Premium: 235, Deluxe: 210 };
export const HANDOVER = { RIDER: "Meet the Rider", LOBBY: "Leave at Lobby" };
export const CHANNELS = ["Text", "Viber", "Messenger", "In-Person / Walk-in", "App"];
export const INSTRUCTION_LIMIT = 150;

export const STATUS_FLOW = [
  "New Request", "Assigned for Pickup", "Picked Up", "In Shop", "Ready for Delivery",
  "Out for Delivery", "Delivered", "Payment Verification", "Completed",
];

// A customer can only cancel before a rider is dispatched; staff can abort any in-progress order.
export const CUSTOMER_CANCELLABLE = ["New Request"];
export const ABORTABLE = ["New Request", "Assigned for Pickup", "Picked Up", "In Shop", "Ready for Delivery", "Out for Delivery"];

export function nextStatus(status) {
  const i = STATUS_FLOW.indexOf(status);
  return i === -1 || i === STATUS_FLOW.length - 1 ? null : STATUS_FLOW[i + 1];
}

// Suggested bill: one package is billed per 8kg load; several packages are each their own load.
export function suggestPrice(packageIds, weightKg) {
  const w = Number(weightKg);
  if (!w || w <= 0 || !packageIds.length) return null;
  const unit = packageIds.reduce((s, id) => s + (PACKAGE_PRICE[id] ?? 0), 0);
  return packageIds.length > 1 ? unit : Math.ceil(w / MAX_LOAD_KG) * unit;
}

// Reason an order cannot move to its next status (null = free to advance). `order` is the camelCase API shape.
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
  if (order.status === "Picked Up" && !order.weightKg) return "Attendant must weigh the load first";
  return null;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
