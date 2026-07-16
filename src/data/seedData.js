// Mock/seed data for the front-end-only prototype.
// In production this file is replaced by API calls to a real backend.

export const PACKAGE_PRICE = { Premium: 235, Deluxe: 210 };

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
  "New Request": "bg-slate-100 text-slate-700 border-slate-300",
  "Assigned for Pickup": "bg-blue-50 text-blue-700 border-blue-300",
  "Picked Up": "bg-blue-50 text-blue-700 border-blue-300",
  "In Shop": "bg-amber-50 text-amber-700 border-amber-300",
  "Ready for Delivery": "bg-teal-50 text-teal-700 border-teal-300",
  "Out for Delivery": "bg-teal-50 text-teal-700 border-teal-300",
  "Delivered": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "Payment Verification": "bg-purple-50 text-purple-700 border-purple-300",
  "Completed": "bg-emerald-100 text-emerald-800 border-emerald-400",
};

export const SEED_CUSTOMERS = [
  { id: "c1", name: "Ana Reyes", contact: "0917 111 2222", pickupAddr: "Blk 4 Lot 2, Brgy. San Roque", deliveryAddr: "Same as pickup", paymentMode: "Cash", defaultPackage: "Deluxe" },
  { id: "c2", name: "Mark Santos", contact: "0918 222 3333", pickupAddr: "Unit 12B, Sunrise Condo Lobby", deliveryAddr: "Sunrise Condo Lobby", paymentMode: "GCash", defaultPackage: "Premium" },
  { id: "c3", name: "Liza Cruz", contact: "0919 333 4444", pickupAddr: "45 Mabini St.", deliveryAddr: "45 Mabini St.", paymentMode: "Cash", defaultPackage: "Deluxe" },
  { id: "c4", name: "Joseph Tan", contact: "0920 444 5555", pickupAddr: "Unit 8A, Palm Residences Lobby", deliveryAddr: "Palm Residences Lobby", paymentMode: "GCash", defaultPackage: "Premium" },
  { id: "c5", name: "Grace Dela Cruz", contact: "0921 555 6666", pickupAddr: "12 Rizal Ave.", deliveryAddr: "12 Rizal Ave.", paymentMode: "Cash", defaultPackage: "Deluxe" },
  { id: "c6", name: "Paolo Reyes", contact: "0922 666 7777", pickupAddr: "Unit 3C, Sunrise Condo Lobby", deliveryAddr: "Sunrise Condo Lobby", paymentMode: "GCash", defaultPackage: "Premium" },
];

export const SEED_ORDERS = [
  { id: "o1001", customerId: "c1", status: "New Request", package: "Deluxe", weight: null, price: null, handover: "Personal", channel: "Viber", riderId: null, proofPhoto: false, paymentStatus: "Unpaid", paymentMethod: "Cash", gcashRef: "", delay: null, createdAt: "Jul 16, 8:02 AM", notes: "" },
  { id: "o1002", customerId: "c2", status: "Assigned for Pickup", package: "Premium", weight: null, price: null, handover: "Lobby", channel: "Messenger", riderId: "r1", proofPhoto: true, paymentStatus: "Unpaid", paymentMethod: "GCash", gcashRef: "", delay: null, createdAt: "Jul 16, 8:15 AM", notes: "Bag photo attached by customer" },
  { id: "o1003", customerId: "c3", status: "Picked Up", package: "Deluxe", weight: 6.2, price: 210, handover: "Personal", channel: "Text", riderId: "r2", proofPhoto: false, paymentStatus: "Unpaid", paymentMethod: "Cash", gcashRef: "", delay: null, createdAt: "Jul 15, 3:40 PM", notes: "" },
  { id: "o1004", customerId: "c4", status: "In Shop", package: "Premium", weight: 7.8, price: 235, handover: "Lobby", channel: "Messenger", riderId: "r1", proofPhoto: true, paymentStatus: "Unpaid", paymentMethod: "GCash", gcashRef: "", delay: { reason: "Machine volume — pushed to next day" }, createdAt: "Jul 15, 11:10 AM", notes: "" },
  { id: "o1005", customerId: "c5", status: "Ready for Delivery", package: "Deluxe", weight: 5.5, price: 210, handover: "Personal", channel: "Viber", riderId: "r2", proofPhoto: false, paymentStatus: "Unpaid", paymentMethod: "Cash", gcashRef: "", delay: null, createdAt: "Jul 15, 9:20 AM", notes: "" },
  { id: "o1006", customerId: "c6", status: "Out for Delivery", package: "Premium", weight: 4.9, price: 235, handover: "Lobby", channel: "Text", riderId: "r1", proofPhoto: false, paymentStatus: "Unpaid", paymentMethod: "GCash", gcashRef: "", delay: null, createdAt: "Jul 14, 4:00 PM", notes: "" },
  { id: "o1007", customerId: "c1", status: "Delivered", package: "Deluxe", weight: 6.0, price: 210, handover: "Personal", channel: "Viber", riderId: "r2", proofPhoto: false, paymentStatus: "Pending Verification", paymentMethod: "Cash", gcashRef: "", delay: null, createdAt: "Jul 14, 10:05 AM", notes: "" },
  { id: "o1008", customerId: "c4", status: "Payment Verification", package: "Premium", weight: 7.1, price: 235, handover: "Lobby", channel: "Messenger", riderId: "r1", proofPhoto: true, paymentStatus: "Pending Verification", paymentMethod: "GCash", gcashRef: "4821", delay: null, createdAt: "Jul 13, 1:30 PM", notes: "" },
  { id: "o1009", customerId: "c3", status: "Completed", package: "Deluxe", weight: 6.4, price: 210, handover: "Personal", channel: "Text", riderId: "r2", proofPhoto: false, paymentStatus: "Verified", paymentMethod: "Cash", gcashRef: "", delay: null, createdAt: "Jul 12, 9:00 AM", notes: "" },
];

export const SEED_COMPLAINTS = [
  { id: "t1", orderId: "o1004", channel: "Messenger", message: "Hi, is my laundry ready? Was told same day.", status: "Open", assignedTo: null, response: "", createdAt: "Jul 16, 7:40 AM" },
  { id: "t2", orderId: "o1006", channel: "Viber", message: "Rider hasn't arrived yet, been waiting 30 mins.", status: "In Progress", assignedTo: "r1", response: "Rider is 2 stops away, will arrive in ~10 mins.", createdAt: "Jul 16, 6:55 AM" },
  { id: "t3", orderId: "o1009", channel: "Text", message: "Can confirm total came out correct? Wanted to double check.", status: "Resolved", assignedTo: "a1", response: "Confirmed with attendant — ₱210 for Deluxe, matches receipt.", createdAt: "Jul 12, 2:00 PM" },
];
