// Demo data for `npm run db:seed`. Self-contained so the backend does not depend on the frontend package.
// Mirrors the prototype's seed (frontend/src/data/seedData.js); timestamps are relative to "now".

const HOUR = 3600 * 1000;
const ago = (hours) => Date.now() - hours * HOUR;

const addr = (unit, subdivision, barangay, city, landmark = "") => ({ unit, subdivision, barangay, city, landmark });

export const STAFF = [
  { key: "owner", name: "Owner", role: "owner" },
  { key: "a1", name: "Nena (Attendant)", role: "attendant" },
  { key: "r1", name: "Jun (Rider)", role: "rider" },
  { key: "r2", name: "Bong (Rider)", role: "rider" },
];

const person = (key, firstName, lastName, contact, address, deliveryAddress, createdHoursAgo) => ({
  key, firstName, lastName, contact, pin: "1234", address, deliveryAddress,
  email: `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, "") + "@example.com",
  area: address.subdivision, createdTs: ago(createdHoursAgo),
});

export const CUSTOMERS = [
  person("c1", "ANA", "REYES", "0917 111 2222", addr("BLK 4 LOT 2, SAN ROQUE ST.", "SAN ROQUE VILLAGE", "SAN ROQUE", "QUEZON CITY"), null, 400),
  person("c2", "MARK", "SANTOS", "0918 222 3333", addr("UNIT 12B", "SUNRISE CONDO", "POBLACION", "QUEZON CITY", "NEAR THE MAIN LOBBY"), addr("LOBBY", "SUNRISE CONDO", "POBLACION", "QUEZON CITY"), 300),
  person("c3", "LIZA", "CRUZ", "0919 333 4444", addr("45 MABINI ST.", "MABINI HEIGHTS", "MABINI", "QUEZON CITY"), null, 200),
  person("c4", "JOSEPH", "TAN", "0920 444 5555", addr("UNIT 8A", "PALM RESIDENCES", "BAGONG PAG-ASA", "QUEZON CITY"), addr("LOBBY", "PALM RESIDENCES", "BAGONG PAG-ASA", "QUEZON CITY"), 150),
  person("c5", "GRACE", "DELA CRUZ", "0921 555 6666", addr("12 RIZAL AVE.", "RIZAL VILLAGE", "RIZAL", "QUEZON CITY", "BLUE GATE"), null, 100),
  person("c6", "PAOLO", "REYES", "0922 666 7777", addr("UNIT 3C", "SUNRISE CONDO", "POBLACION", "QUEZON CITY"), addr("LOBBY", "SUNRISE CONDO", "POBLACION", "QUEZON CITY"), 90),
];

const RIDER = "Meet the Rider";
const LOBBY = "Leave at Lobby";
const AM = "8:00 AM - 12:00 NN";
const PM = "1:00 PM - 6:30 PM";

// `hrs` = hours since the request was created; `payHrs` = hours since the payment was logged.
export const ORDERS = [
  { cid: "c1", status: "New Request", pkgs: ["Deluxe"], weight: null, price: null, handover: RIDER, channel: "Viber", rider: null, pay: "Unpaid", method: "Cash", hrs: 1, slot: AM },
  { cid: "c2", status: "Assigned for Pickup", pkgs: ["Premium"], weight: null, price: null, handover: LOBBY, channel: "Messenger", rider: "r1", pay: "Unpaid", method: "GCash", hrs: 1, slot: AM },
  { cid: "c3", status: "Picked Up", pkgs: ["Deluxe"], weight: 6.2, price: 210, handover: RIDER, channel: "Text", rider: "r2", pay: "Unpaid", method: "Cash", hrs: 18, slot: PM },
  { cid: "c4", status: "In Shop", pkgs: ["Premium"], weight: 7.8, price: 235, handover: LOBBY, channel: "Messenger", rider: "r1", pay: "Verified", method: "GCash", hrs: 22, slot: AM, delay: { reason: "Machine volume — pushed to next day", eta: "Tomorrow, 10:00 AM", notified: false } },
  { cid: "c5", status: "Ready for Delivery", pkgs: ["Deluxe"], weight: 5.5, price: 210, handover: RIDER, channel: "Viber", rider: "r2", pay: "Unpaid", method: "Cash", hrs: 30, slot: PM },
  { cid: "c6", status: "Out for Delivery", pkgs: ["Premium"], weight: 4.9, price: 235, handover: LOBBY, channel: "Text", rider: "r1", pay: "Verified", method: "GCash", hrs: 44, slot: AM },
  { cid: "c1", status: "Delivered", pkgs: ["Deluxe"], weight: 6.0, price: 210, handover: RIDER, channel: "Viber", rider: "r2", pay: "Pending Verification", method: "Cash", hrs: 46, slot: AM, payHrs: 30 },
  { cid: "c4", status: "Payment Verification", pkgs: ["Premium", "Deluxe"], weight: 7.1, price: 445, handover: RIDER, channel: "Messenger", rider: "r1", pay: "Pending Verification", method: "GCash", hrs: 70, slot: PM, payHrs: 26, ref: "4821" },
  { cid: "c3", status: "Completed", pkgs: ["Deluxe"], weight: 6.4, price: 210, handover: RIDER, channel: "Text", rider: "r2", pay: "Verified", method: "Cash", hrs: 96, slot: AM, payHrs: 80 },
];

// `order` is an index into ORDERS; `assignedTo` is a STAFF key.
export const COMPLAINTS = [
  { order: 3, kind: "Issue", channel: "Messenger", message: "Hi, is my laundry ready? Was told same day.", status: "Open", assignedTo: null, response: "", hrs: 2 },
  { order: 5, kind: "Issue", channel: "Viber", message: "Rider hasn't arrived yet, been waiting 30 mins.", status: "In Progress", assignedTo: "r1", response: "Rider is 2 stops away, will arrive in ~10 mins.", hrs: 3 },
  { order: 8, kind: "Issue", channel: "Text", message: "Can confirm total came out correct? Wanted to double check.", status: "Resolved", assignedTo: "a1", response: "Confirmed with attendant — ₱210 for Deluxe, matches receipt.", hrs: 90 },
];

export { ago };
