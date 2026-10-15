// Builds the automated group-chat messages (Facebook Messenger). The prototype has no
// outbound integration, so App stores these in an outbox the owner can preview.
import { PACKAGE_PRICE, PACKAGE_NAME } from "../data/seedData.js";
import { formatAddress } from "./address.js";
import { capsDateHeader, formatDateTime } from "./time.js";

// Messenger Send API: a text message is limited to 2,000 UTF-8 characters.
export const MESSENGER_LIMIT = 2000;
const PART_PREFIX_RESERVE = 24; // room for "PART 10 OF 10\n\n"

function entryText(index, order, customer) {
  const lines = [
    `${index}.`,
    `• Order ID: ${order.id}`,
    `• Complete Name: ${customer?.name ?? "—"}`,
    `• Mobile Number: ${customer?.contact ?? "—"}`,
    `• Pickup Address: ${formatAddress(customer?.address)}`,
    `• Handover Method: ${order.handover}`,
    `• Package & Instructions:`,
  ];
  (order.packages || []).forEach((p) => {
    lines.push(`   - ${(PACKAGE_NAME[p.id] || p.id).toUpperCase()} - ${PACKAGE_PRICE[p.id]}`);
    if (p.instruction?.trim()) lines.push(`     (Special Instruction: ${p.instruction.trim()})`);
  });
  return lines.join("\n");
}

function splitLongEntry(text, limit) {
  const chunks = [];
  for (let i = 0; i < text.length; i += limit) chunks.push(text.slice(i, i + limit));
  return chunks;
}

// All pick-up requests for one date, FIFO by submission time, compiled into one summary and
// paginated so no message exceeds the Messenger limit.
export function buildPickupSummary(orders, customers, pickupDate) {
  const list = orders
    .filter((o) => o.pickupDate === pickupDate && o.status !== "Cancelled")
    .sort((a, b) => (a.createdTs ?? 0) - (b.createdTs ?? 0));
  const header = `${capsDateHeader(pickupDate)}\n\nPICK UP REQUEST\n`;
  const budget = MESSENGER_LIMIT - PART_PREFIX_RESERVE;

  const chunks = [];
  let current = header;
  list.forEach((o, i) => {
    const entry = "\n" + entryText(i + 1, o, customers.find((c) => c.id === o.customerId)) + "\n";
    if (current.length + entry.length > budget && current.trim() !== header.trim()) {
      chunks.push(current);
      current = "";
    }
    if (entry.length > budget) {
      // Defensive only: a single request is far below the limit in practice.
      if (current) chunks.push(current);
      const pieces = splitLongEntry(entry, budget);
      pieces.slice(0, -1).forEach((p) => chunks.push(p));
      current = pieces[pieces.length - 1];
    } else {
      current += entry;
    }
  });
  if (current) chunks.push(current);

  const n = chunks.length;
  return n > 1 ? chunks.map((c, i) => `PART ${i + 1} OF ${n}\n\n${c}`) : chunks;
}

export function buildReceiptAlert(order, customer, ts, link) {
  return [
    "NEW PAYMENT RECEIPT UPLOADED",
    `• Order ID: ${order.id}`,
    `• Customer Name: ${customer?.name ?? "—"}`,
    `• Mobile Number: ${customer?.contact ?? "—"}`,
    `• Address: ${formatAddress(customer?.address)}`,
    `• Amount Due: ₱${order.price ?? "—"}`,
    `• Date & Time Uploaded: ${formatDateTime(ts)}`,
    "",
    "🚨🚨 HANDOVER METHOD: LEAVE AT LOBBY 🚨🚨",
    "",
    `Approve / Reject: ${link}`,
  ].join("\n");
}
