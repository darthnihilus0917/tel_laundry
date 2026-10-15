import { useMemo, useState } from "react";
import { UserPlus, ClipboardList, PackageCheck, Shirt, CheckCircle2, Banknote, Smartphone, Wallet, ArrowUp, ArrowDown, Minus } from "lucide-react";
import Modal from "./Modal.jsx";
import { STATUS_FLOW } from "../data/seedData.js";
import { dateKey, addDaysKey, formatPickupDate } from "../utils/time.js";

const METRICS = [
  { key: "newCustomers", label: "Total New Customers", icon: UserPlus },
  { key: "requests", label: "Total Pickup Requests", icon: ClipboardList },
  { key: "pickedUp", label: "Total Picked Ups", icon: PackageCheck },
  { key: "atShop", label: "Total At The Shop", icon: Shirt },
  { key: "delivered", label: "Total Delivered", icon: CheckCircle2 },
  { key: "cash", label: "Total Cash", icon: Banknote, money: true },
  { key: "online", label: "Total Online Payment", icon: Smartphone, money: true },
  { key: "amount", label: "Total Amount", icon: Wallet, money: true },
];

const idx = (s) => STATUS_FLOW.indexOf(s);
const fmt = (m, v) => (m.money ? `₱${Math.round(v).toLocaleString("en-PH")}` : String(Math.round(v * 10) / 10));
const monthKey = (key) => key.slice(0, 7);

function lastDayOfMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
function shiftMonth(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

// Per-day metrics are grouped by the order's request date (Manila time) and recompute live from app state.
function buildDayMap(orders, customers) {
  const days = {};
  const get = (k) => (days[k] ||= { newCustomers: 0, requests: 0, pickedUp: 0, atShop: 0, delivered: 0, cash: 0, online: 0, amount: 0 });
  customers.forEach((c) => { if (c.createdTs) get(dateKey(c.createdTs)).newCustomers += 1; });
  orders.forEach((o) => {
    const d = get(dateKey(o.createdTs));
    d.requests += 1;
    if (o.status === "Cancelled" || o.status === "Rider Will Return") return;
    const i = idx(o.status);
    if (i >= idx("Picked Up")) d.pickedUp += 1;
    if (i >= idx("In Shop")) d.atShop += 1;
    if (i >= idx("Delivered")) d.delivered += 1;
    if (o.paymentStatus === "Verified" && o.price) {
      if (o.paymentMethod === "Cash") d.cash += o.price; else d.online += o.price;
      d.amount += o.price;
    }
  });
  return days;
}

function sumRange(dayMap, from, to) {
  const t = Object.fromEntries(METRICS.map((m) => [m.key, 0]));
  Object.entries(dayMap).forEach(([k, v]) => {
    if (k >= from && k <= to) METRICS.forEach((m) => { t[m.key] += v[m.key]; });
  });
  return t;
}

export default function DailyMetrics({ orders, customers }) {
  const today = dateKey();
  const thisMonth = monthKey(today);
  const [custom, setCustom] = useState(null); // { from, to } or null = month to date
  const [draft, setDraft] = useState({ from: `${thisMonth}-01`, to: today });
  const [open, setOpen] = useState(null); // enlarged day key

  const dayMap = useMemo(() => buildDayMap(orders, customers), [orders, customers]);

  const from = custom?.from ?? `${thisMonth}-01`;
  const to = custom?.to ?? today;
  const mtd = sumRange(dayMap, from, to);

  // Average of the three full calendar months before the range's starting month.
  const startMonth = monthKey(from);
  const prior = [1, 2, 3].map((n) => shiftMonth(startMonth, -n));
  const avg = Object.fromEntries(METRICS.map((m) => [m.key, 0]));
  prior.forEach((ym) => {
    const t = sumRange(dayMap, `${ym}-01`, lastDayOfMonth(ym));
    METRICS.forEach((m) => { avg[m.key] += t[m.key] / 3; });
  });
  const growth = (m) => (avg[m.key] > 0 ? ((mtd[m.key] - avg[m.key]) / avg[m.key]) * 100 : null);

  // Calendar days shown: the selected range, newest first so today is always at the top.
  const days = [];
  for (let k = to; k >= from && days.length < 93; k = addDaysKey(k, -1)) days.push(k);

  const rangeLabel = custom ? `${formatPickupDate(from)} – ${formatPickupDate(to)}` : "Month to date";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-700">Daily Metrics <span className="font-normal text-slate-400">· {rangeLabel}</span></h2>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <label className="text-slate-500">From <input type="date" value={draft.from} max={today} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="ml-1 rounded-md border border-slate-200 px-1.5 py-1" /></label>
          <label className="text-slate-500">To <input type="date" value={draft.to} max={today} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="ml-1 rounded-md border border-slate-200 px-1.5 py-1" /></label>
          <button
            onClick={() => draft.from && draft.to && draft.from <= draft.to && setCustom({ ...draft })}
            className="rounded-md bg-slate-800 px-2.5 py-1.5 font-medium text-white"
          >Apply</button>
          {custom && <button onClick={() => setCustom(null)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-600">Month to date</button>}
        </div>
      </div>

      {/* Sticky summary: MTD, 3-month average, growth */}
      <div className="sticky top-14 z-20 mt-3 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur md:top-0" data-testid="metrics-summary">
        <div className="grid grid-cols-[4.5rem_repeat(8,minmax(0,1fr))] items-center gap-1 text-center text-xs">
          <div />
          {METRICS.map((m) => {
            const Icon = m.icon;
            return <div key={m.key} title={m.label} aria-label={m.label} className="flex justify-center text-slate-500"><Icon size={15} /></div>;
          })}
          <div className="text-left font-medium text-slate-700">{custom ? "Range" : "MTD"}</div>
          {METRICS.map((m) => <div key={m.key} className="font-semibold text-slate-800">{fmt(m, mtd[m.key])}</div>)}
          <div className="text-left text-slate-500" title="Average of the 3 full months before this period">3-mo avg</div>
          {METRICS.map((m) => <div key={m.key} className="text-slate-600">{fmt(m, avg[m.key])}</div>)}
          <div className="text-left text-slate-500">Growth</div>
          {METRICS.map((m) => {
            const g = growth(m);
            if (g == null) return <div key={m.key} className="flex justify-center text-slate-300"><Minus size={13} /></div>;
            const up = g >= 0;
            return (
              <div key={m.key} className={`flex items-center justify-center gap-0.5 font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
                {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{Math.abs(Math.round(g))}%
              </div>
            );
          })}
        </div>
      </div>

      {/* Day-by-day boxes */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((k) => {
          const d = dayMap[k] || Object.fromEntries(METRICS.map((m) => [m.key, 0]));
          const isToday = k === today;
          return (
            <button
              key={k} onClick={() => setOpen(k)} aria-label={`Open ${formatPickupDate(k)}`}
              className={`rounded-xl border p-3 text-left transition hover:shadow-md ${isToday ? "border-teal-500 bg-teal-50 ring-2 ring-teal-300" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>{formatPickupDate(k)}</span>
                {isToday && <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">(Today)</span>}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-x-2 gap-y-2">
                {METRICS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.key} title={m.label} aria-label={`${m.label}: ${fmt(m, d[m.key])}`} className="flex flex-col items-center text-slate-600">
                      <Icon size={14} className="text-slate-400" />
                      <span className="mt-0.5 text-xs font-semibold">{fmt(m, d[m.key])}</span>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <Modal title={`${formatPickupDate(open)}${open === today ? " (Today)" : ""}`} onClose={() => setOpen(null)}>
          <ul className="divide-y divide-slate-100 text-sm">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const v = (dayMap[open] || {})[m.key] || 0;
              return (
                <li key={m.key} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-slate-600"><Icon size={15} className="text-slate-400" />{m.label}</span>
                  <span className="font-semibold">{fmt(m, v)}</span>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setOpen(null)} className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Close</button>
        </Modal>
      )}
    </div>
  );
}
