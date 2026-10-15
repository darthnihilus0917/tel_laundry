// Mock/seed data for the front-end-only prototype.
// In production this file is replaced by API calls to a real backend.
import { dateKey, mmddyy } from "../utils/time.js";

// Seed timestamps are relative to "now" so age/SLA flags stay meaningful.
const ago = (hours) => Date.now() - hours * 3600 * 1000;

export const MAX_LOAD_KG = 8;

// Single branch today; every customer/order/ticket row carries branch_id so a second branch is a filter, not a migration.
export const DEFAULT_BRANCH = "main";

// Service tabs on the order form. Only Laundry is live; the others are laid out for later.
export const SERVICES = [
  { id: "laundry", label: "Laundry Services", live: true },
  { id: "cleaning", label: "Cleaning Service", live: false },
  { id: "dryclean", label: "Dry Clean Service", live: false },
];

export const PACKAGES = [
  {
    id: "Premium", name: "Premium Package 3", price: 235, tagline: "The Ultimate Clean & Care",
    inclusions: "Trusted USA Brands: Arm & Hammer • Snuggle • OxiClean",
  },
  {
    id: "Deluxe", name: "Deluxe Package 2", price: 210, tagline: "Double Dose Power",
    inclusions: "Proven Effective: 2pcs Ariel • 2pcs Downy • Zonrox Color Safe",
  },
];

export const PACKAGE_PRICE = Object.fromEntries(PACKAGES.map((p) => [p.id, p.price]));
export const PACKAGE_NAME = Object.fromEntries(PACKAGES.map((p) => [p.id, p.name]));

export const INSTRUCTION_LIMIT = 150;

export const HANDOVER = { RIDER: "Meet the Rider", LOBBY: "Leave at Lobby" };
export const REQUEST_CHANNELS = ["Text", "Viber", "Messenger", "In-Person / Walk-in"];

// Placeholder payment details — swap in the shop's real GCash QR (public/gcash-qr.svg) and number.
export const GCASH = { name: "THE EMPRESS LAUNDRY", number: "0917 000 0000", qr: "/gcash-qr.svg" };

export const RIDERS = [
  { id: "r1", name: "Jun (Rider)" },
  { id: "r2", name: "Bong (Rider)" },
];

export const ATTENDANT = { id: "a1", name: "Nena (Attendant)" };

export const STATUS_FLOW = [
  "New Request",
  "Assigned for Pickup",
  "Picked Up",
  "In Shop",
  "Ready for Delivery",
  "Out for Delivery",
  "Delivered",
  "Payment Verification",
  "Completed",
];

export const STATUS_COLOR = {
  "New Request": "bg-yellow-50 text-yellow-700 border-yellow-300",
  "Assigned for Pickup": "bg-blue-50 text-blue-700 border-blue-300",
  "Picked Up": "bg-teal-50 text-teal-700 border-teal-300",
  "In Shop": "bg-purple-50 text-purple-700 border-purple-300",
  "Ready for Delivery": "bg-purple-50 text-purple-700 border-purple-300",
  "Out for Delivery": "bg-orange-50 text-orange-700 border-orange-300",
  "Delivered": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "Payment Verification": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "Completed": "bg-emerald-100 text-emerald-800 border-emerald-400",
  "Rider Will Return": "bg-slate-100 text-slate-600 border-slate-300",
  "Cancelled": "bg-red-50 text-red-700 border-red-300",
};

// The customer sees an 8-step flow; several internal shop statuses collapse into one badge.
export const CUSTOMER_STAGE = {
  "New Request": { label: "Request Sent", color: STATUS_COLOR["New Request"] },
  "Assigned for Pickup": { label: "Rider on the Way", color: STATUS_COLOR["Assigned for Pickup"] },
  "Picked Up": { label: "Picked Up", color: STATUS_COLOR["Picked Up"] },
  "In Shop": { label: "At the Shop", color: STATUS_COLOR["In Shop"] },
  "Ready for Delivery": { label: "At the Shop", color: STATUS_COLOR["Ready for Delivery"] },
  "Out for Delivery": { label: "Out for Delivery", color: STATUS_COLOR["Out for Delivery"] },
  "Delivered": { label: "Delivered", color: STATUS_COLOR["Delivered"] },
  "Payment Verification": { label: "Delivered", color: STATUS_COLOR["Delivered"] },
  "Completed": { label: "Delivered", color: STATUS_COLOR["Delivered"] },
  "Rider Will Return": { label: "Rider Will Return", color: STATUS_COLOR["Rider Will Return"] },
  "Cancelled": { label: "Cancelled", color: STATUS_COLOR["Cancelled"] },
};

// A customer can only cancel while the request is still "Request Sent" (before a rider is dispatched).
export const CANCELLABLE_STATUSES = ["New Request"];
// Statuses where "Follow up on order" shows: Request Sent, Rider on the Way, At the Shop, Out for Delivery, Rider Will Return.
export const FOLLOWUP_STATUSES = ["New Request", "Assigned for Pickup", "In Shop", "Ready for Delivery", "Out for Delivery", "Rider Will Return"];
export const DELIVERED_STATUSES = ["Delivered", "Payment Verification", "Completed"];
// Statuses from which staff can abort an in-progress order.
export const ABORTABLE_STATUSES = ["New Request", "Assigned for Pickup", "Picked Up", "In Shop", "Ready for Delivery", "Out for Delivery"];

export const RETURN_REASONS = [
  "Tried calling, but no answer",
  "No bag at the lobby yet",
  "No one available for handover",
  "Laundry not quite ready",
];
export const CANCEL_REASONS = [
  "Customer cancelled upon arrival",
  "Customer changed their mind",
  "Duplicate booking",
];
export const REJECT_RECEIPT_REASONS = [
  "Receipt is blurry or unreadable",
  "Amount does not match the final bill",
  "Payment not found in the shop's account",
];

const addr = (unit, subdivision, barangay, city, landmark = "") => ({ unit, subdivision, barangay, city, landmark });
const person = (id, firstName, lastName, contact, address, deliveryAddress, createdHoursAgo) => ({
  id, firstName, lastName, name: `${firstName} ${lastName}`, contact, pin: "1234",
  address, deliveryAddress, area: address.subdivision, branchId: DEFAULT_BRANCH, createdTs: ago(createdHoursAgo),
});

export const SEED_CUSTOMERS = [
  person("c1", "ANA", "REYES", "0917 111 2222", addr("BLK 4 LOT 2, SAN ROQUE ST.", "SAN ROQUE VILLAGE", "SAN ROQUE", "QUEZON CITY"), null, 400),
  person("c2", "MARK", "SANTOS", "0918 222 3333", addr("UNIT 12B", "SUNRISE CONDO", "POBLACION", "QUEZON CITY", "NEAR THE MAIN LOBBY"), addr("LOBBY", "SUNRISE CONDO", "POBLACION", "QUEZON CITY"), 300),
  person("c3", "LIZA", "CRUZ", "0919 333 4444", addr("45 MABINI ST.", "MABINI HEIGHTS", "MABINI", "QUEZON CITY"), null, 200),
  person("c4", "JOSEPH", "TAN", "0920 444 5555", addr("UNIT 8A", "PALM RESIDENCES", "BAGONG PAG-ASA", "QUEZON CITY"), addr("LOBBY", "PALM RESIDENCES", "BAGONG PAG-ASA", "QUEZON CITY"), 150),
  person("c5", "GRACE", "DELA CRUZ", "0921 555 6666", addr("12 RIZAL AVE.", "RIZAL VILLAGE", "RIZAL", "QUEZON CITY", "BLUE GATE"), null, 100),
  person("c6", "PAOLO", "REYES", "0922 666 7777", addr("UNIT 3C", "SUNRISE CONDO", "POBLACION", "QUEZON CITY"), addr("LOBBY", "SUNRISE CONDO", "POBLACION", "QUEZON CITY"), 90),
];

const SLOT_AM = "8:00 AM - 12:00 NN";
const SLOT_PM = "1:00 PM - 6:30 PM";
const SEED_SPECS = [
  { cid: "c1", status: "New Request", pkgs: ["Deluxe"], weight: null, price: null, handover: HANDOVER.RIDER, channel: "Viber", riderId: null, pay: "Unpaid", method: "Cash", hrs: 1, slot: SLOT_AM },
  { cid: "c2", status: "Assigned for Pickup", pkgs: ["Premium"], weight: null, price: null, handover: HANDOVER.LOBBY, channel: "Messenger", riderId: "r1", pay: "Unpaid", method: "GCash", hrs: 1, slot: SLOT_AM, bag: true },
  { cid: "c3", status: "Picked Up", pkgs: ["Deluxe"], weight: 6.2, price: 210, handover: HANDOVER.RIDER, channel: "Text", riderId: "r2", pay: "Unpaid", method: "Cash", hrs: 18, slot: SLOT_PM },
  { cid: "c4", status: "In Shop", pkgs: ["Premium"], weight: 7.8, price: 235, handover: HANDOVER.LOBBY, channel: "Messenger", riderId: "r1", pay: "Verified", method: "GCash", hrs: 22, slot: SLOT_AM, bag: true, delay: { reason: "Machine volume — pushed to next day", eta: "Tomorrow, 10:00 AM", notified: false } },
  { cid: "c5", status: "Ready for Delivery", pkgs: ["Deluxe"], weight: 5.5, price: 210, handover: HANDOVER.RIDER, channel: "Viber", riderId: "r2", pay: "Unpaid", method: "Cash", hrs: 30, slot: SLOT_PM },
  { cid: "c6", status: "Out for Delivery", pkgs: ["Premium"], weight: 4.9, price: 235, handover: HANDOVER.LOBBY, channel: "Text", riderId: "r1", pay: "Verified", method: "GCash", hrs: 44, slot: SLOT_AM, bag: true },
  { cid: "c1", status: "Delivered", pkgs: ["Deluxe"], weight: 6.0, price: 210, handover: HANDOVER.RIDER, channel: "Viber", riderId: "r2", pay: "Pending Verification", method: "Cash", hrs: 46, slot: SLOT_AM, payHrs: 30 },
  { cid: "c4", status: "Payment Verification", pkgs: ["Premium", "Deluxe"], weight: 7.1, price: 445, handover: HANDOVER.RIDER, channel: "Messenger", riderId: "r1", pay: "Pending Verification", method: "GCash", hrs: 70, slot: SLOT_PM, payHrs: 26, ref: "4821" },
  { cid: "c3", status: "Completed", pkgs: ["Deluxe"], weight: 6.4, price: 210, handover: HANDOVER.RIDER, channel: "Text", riderId: "r2", pay: "Verified", method: "Cash", hrs: 96, slot: SLOT_AM, payHrs: 80 },
];

export const SEED_ORDERS = SEED_SPECS.map((s, i) => {
  const createdTs = ago(s.hrs);
  const o = {
    id: `TEL-${mmddyy(createdTs)}-${1001 + i}`,
    customerId: s.cid, branchId: DEFAULT_BRANCH, status: s.status,
    packages: s.pkgs.map((id) => ({ id, instruction: "" })),
    weight: s.weight, price: s.price, handover: s.handover, channel: s.channel, riderId: s.riderId,
    proofPhoto: false, paymentStatus: s.pay, paymentMethod: s.method, gcashRef: s.ref || "",
    delay: s.delay || null, notes: "", createdTs,
    pickupDate: dateKey(createdTs), pickupSlot: s.slot,
  };
  if (s.payHrs) o.paymentTs = ago(s.payHrs);
  if (s.pay === "Verified") { o.verifiedTs = ago(Math.max(1, (s.payHrs || s.hrs) - 2)); o.verifiedBy = "Owner"; }
  return o;
});

const seedId = (i) => SEED_ORDERS[i].id;

export const SEED_COMPLAINTS = [
  { id: "t1", orderId: seedId(3), branchId: DEFAULT_BRANCH, kind: "Issue", channel: "Messenger", message: "Hi, is my laundry ready? Was told same day.", status: "Open", assignedTo: null, response: "", createdAt: "Jul 16, 7:40 AM", createdTs: ago(2) },
  { id: "t2", orderId: seedId(5), branchId: DEFAULT_BRANCH, kind: "Issue", channel: "Viber", message: "Rider hasn't arrived yet, been waiting 30 mins.", status: "In Progress", assignedTo: "r1", response: "Rider is 2 stops away, will arrive in ~10 mins.", createdAt: "Jul 16, 6:55 AM", createdTs: ago(3) },
  { id: "t3", orderId: seedId(8), branchId: DEFAULT_BRANCH, kind: "Issue", channel: "Text", message: "Can confirm total came out correct? Wanted to double check.", status: "Resolved", assignedTo: "a1", response: "Confirmed with attendant — ₱210 for Deluxe, matches receipt.", createdAt: "Jul 12, 2:00 PM", createdTs: ago(90) },
];
