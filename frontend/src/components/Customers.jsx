import { useMemo, useState } from "react";
import { Search, UserPlus, ArrowUp, ArrowDown, Phone, MessageSquare, Copy } from "lucide-react";
import Badge from "./Badge.jsx";
import { DELIVERED_STATUSES } from "../data/seedData.js";
import { packagesLabel, methodLabel, pickupAddressOf } from "../utils/helpers.js";
import { formatLongDate } from "../utils/time.js";

const DAY = 86400000;
const OWNER_ONLY = new Set(["orders", "total", "aov"]);

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "contact", label: "Contact" },
  { key: "address", label: "Pick-Up Address" },
  { key: "lastMode", label: "Last Payment Mode" },
  { key: "lastPackage", label: "Last Package" },
  { key: "firstDate", label: "First Pickup Date" },
  { key: "lastDate", label: "Last Pickup Date" },
  { key: "status", label: "Customer Status" },
  { key: "orders", label: "Orders" },
  { key: "total", label: "Total Transacted Amount" },
  { key: "aov", label: "Average Order Value (AOV)" },
];

// Active 0–14 days since last completed order, At Risk 15–29, Dormant 30+.
function churn(lastTs) {
  if (!lastTs) return { label: "—", rank: 0, dateCls: "text-slate-700" };
  const days = Math.floor((Date.now() - lastTs) / DAY);
  if (days >= 30) return { label: "Dormant", rank: 3, dateCls: "text-red-600 font-medium", badge: "bg-red-50 text-red-700 border-red-300" };
  if (days >= 15) return { label: "At Risk", rank: 2, dateCls: "text-orange-600 font-medium", badge: "bg-orange-50 text-orange-700 border-orange-300" };
  return { label: "Active", rank: 1, dateCls: "text-slate-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-300" };
}

function ContactCell({ contact }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const digits = contact.replace(/[^\d+]/g, "");
  async function copy() {
    try { await navigator.clipboard.writeText(digits); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
  }
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} className="text-teal-700 underline decoration-dotted">{contact}</button>
      {open && (
        <div className="absolute left-0 top-6 z-10 w-32 rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-lg">
          <a href={`tel:${digits}`} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><Phone size={12} /> Call</a>
          <a href={`sms:${digits}`} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><MessageSquare size={12} /> Text / SMS</a>
          <button onClick={copy} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"><Copy size={12} /> {copied ? "Copied" : "Copy number"}</button>
        </div>
      )}
    </div>
  );
}

export default function Customers({ customers, orders, role, goToRegister }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const isOwner = role === "owner";
  const columns = COLUMNS.filter((c) => isOwner || !OWNER_ONLY.has(c.key));

  const rows = useMemo(() => {
    return customers.map((c) => {
      const done = orders
        .filter((o) => o.customerId === c.id && DELIVERED_STATUSES.includes(o.status))
        .sort((a, b) => a.createdTs - b.createdTs);
      const last = done[done.length - 1];
      const total = done.reduce((s, o) => s + (o.price ?? 0), 0);
      const st = churn(last?.createdTs);
      return {
        id: c.id, name: c.name, contact: c.contact, address: pickupAddressOf(c),
        lastMode: last ? methodLabel(last.paymentMethod) : "—",
        lastPackage: last ? packagesLabel(last) : "—",
        firstDate: done[0]?.createdTs ?? null, lastDate: last?.createdTs ?? null,
        status: st.rank, statusInfo: st,
        orders: done.length, total, aov: done.length ? Math.round(total / done.length) : 0,
      };
    });
  }, [customers, orders]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.contact.replace(/\s/g, "").includes(needle.replace(/\s/g, "")));
    const dir = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, q, sort]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const money = (n) => `₱${n.toLocaleString("en-PH")}`;
  const dateCell = (ts) => (ts ? formatLongDate(ts) : "—");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">Customer Directory</h1>
          <p className="mt-1 text-sm text-slate-500">Retention view — click any header to sort. Status is based on days since the last completed order.</p>
        </div>
        <button onClick={goToRegister} className="flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto">
          <UserPlus size={15} /> Register customer
        </button>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or contact…" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-2" aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 font-medium uppercase hover:text-slate-800">
                    {c.label}
                    {sort.key === c.key && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2 font-medium">{r.name}</td>
                <td className="whitespace-nowrap px-3 py-2"><ContactCell contact={r.contact} /></td>
                <td className="min-w-[14rem] px-3 py-2 text-slate-500">{r.address}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.lastMode}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.lastPackage}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{dateCell(r.firstDate)}</td>
                <td className={`whitespace-nowrap px-3 py-2 ${r.statusInfo.dateCls}`}>{dateCell(r.lastDate)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.statusInfo.badge ? <Badge className={r.statusInfo.badge}>{r.statusInfo.label}</Badge> : <span className="text-slate-400">—</span>}
                </td>
                {isOwner && <td className="px-3 py-2 text-slate-600">{r.orders}</td>}
                {isOwner && <td className="whitespace-nowrap px-3 py-2">{money(r.total)}</td>}
                {isOwner && <td className="whitespace-nowrap px-3 py-2">{r.orders ? money(r.aov) : "—"}</td>}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">No customers match "{q}".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
