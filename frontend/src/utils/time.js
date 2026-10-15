// All business-time logic is locked to Philippine time (Asia/Manila), never the device's own zone.
// In production this should come from the server clock; `window.__TEL_NOW` lets tests pin the clock.
const TZ = "Asia/Manila";
const MONTH_SHORT = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function nowMs() {
  return (typeof window !== "undefined" && window.__TEL_NOW) || Date.now();
}

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function manilaParts(ms = nowMs()) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute };
}

const pad = (n) => String(n).padStart(2, "0");

// "2026-08-08" in Manila time.
export function dateKey(ms = nowMs()) {
  const p = manilaParts(ms);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDaysKey(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function weekdayOf(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

// "Aug. 8, Saturday" — date first, then day.
export function formatPickupDate(key) {
  const [, m, d] = key.split("-").map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}, ${weekdayOf(key)}`;
}

// "July 16, 2026 Thursday"
export function formatLongDate(ms) {
  const p = manilaParts(ms);
  const key = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  return `${MONTH_LONG[p.month - 1]} ${p.day}, ${p.year} ${weekdayOf(key)}`;
}

export function formatTime(ms) {
  const { hour, minute } = manilaParts(ms);
  return `${hour % 12 || 12}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatDateTime(ms) {
  return `${formatLongDate(ms)}, ${formatTime(ms)}`;
}

// "AUG 8, 2026" for the group-chat header.
export function capsDateHeader(key) {
  const [y, m, d] = key.split("-").map(Number);
  return `${MONTH_LONG[m - 1].slice(0, 3).toUpperCase()} ${d}, ${y}`;
}

// "080426" — MMDDYY for order IDs.
export function mmddyy(ms) {
  const p = manilaParts(ms);
  return `${pad(p.month)}${pad(p.day)}${pad(p.year % 100)}`;
}

export const SLOTS = [
  { id: "AM", label: "8:00 AM - 12:00 NN" },
  { id: "PM", label: "1:00 PM - 6:30 PM" },
];

const CUTOFF_DATE_MIN = 18 * 60 + 30; // 6:30 PM
const AM_CLOSES_MIN = 13 * 60; // 1:00 PM

// Always exactly 3 consecutive days starting today (rolls at midnight).
// Day 3 is always disabled; Today is disabled from 6:30 PM and the default skips to Tomorrow.
export function pickupDateOptions(ms = nowMs()) {
  const p = manilaParts(ms);
  const today = dateKey(ms);
  const afterCutoff = p.hour * 60 + p.minute >= CUTOFF_DATE_MIN;
  return [0, 1, 2].map((i) => {
    const value = addDaysKey(today, i);
    return {
      value,
      label: formatPickupDate(value),
      disabled: i === 2 || (i === 0 && afterCutoff),
    };
  });
}

export function defaultPickupDate(ms = nowMs()) {
  return (pickupDateOptions(ms).find((o) => !o.disabled) || {}).value;
}

// Slot availability depends on the chosen date and the current Manila time.
export function slotOptions(selectedDate, ms = nowMs()) {
  const p = manilaParts(ms);
  const mins = p.hour * 60 + p.minute;
  const isToday = selectedDate === dateKey(ms);
  return SLOTS.map((s) => ({
    ...s,
    disabled: isToday && (s.id === "AM" ? mins >= AM_CLOSES_MIN : mins >= CUTOFF_DATE_MIN),
  }));
}
