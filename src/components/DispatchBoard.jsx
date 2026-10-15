import { useState } from "react";
import { ArrowRight, Search, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import Badge from "./Badge.jsx";
import { RIDERS, STATUS_COLOR } from "../data/seedData.js";
import { nextStatus, personName, byAge, ageLabel } from "../utils/helpers.js";

// Group the granular status flow into a handful of macro stages so the board
// reads as ~4 wide columns instead of 9 narrow ones — each card still shows
// its exact status, but staff scan by stage rather than by every micro-step.
const GROUPS = [
  { id: "pickup", label: "Pickup", statuses: ["New Request", "Assigned for Pickup", "Picked Up"] },
  { id: "shop", label: "In shop", statuses: ["In Shop"] },
  { id: "delivery", label: "Delivery", statuses: ["Ready for Delivery", "Out for Delivery", "Delivered"] },
  { id: "payment", label: "Payment & done", statuses: ["Payment Verification", "Completed"] },
];

function matchesSearch(order, customers, query) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const name = personName(customers, order.customerId).toLowerCase();
  return name.includes(q) || order.id.toLowerCase().includes(q);
}

function OrderCard({ o, customers, advanceOrder, assignRider }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{personName(customers, o.customerId)}</span>
        <span className="shrink-0 text-xs text-slate-400">{o.id} · {ageLabel(o.createdTs)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge className={STATUS_COLOR[o.status]}>{o.status}</Badge>
        {o.delay && <Badge className="bg-amber-50 text-amber-700 border-amber-300">Next-day</Badge>}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.package}</Badge>
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.handover}</Badge>
      </div>
      {o.status === "New Request" && (
        <select
          onChange={(e) => e.target.value && assignRider(o.id, e.target.value)}
          defaultValue=""
          className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
        >
          <option value="" disabled>Assign rider…</option>
          {RIDERS.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      )}
      {o.riderId && <div className="mt-1.5 text-xs text-slate-500">Rider: {personName(RIDERS, o.riderId)}</div>}
      {o.status === "Picked Up" && !o.weight && <div className="mt-2 text-xs text-slate-400">Waiting for attendant to weigh</div>}
      {nextStatus(o.status) && o.status !== "New Request" && o.status !== "Picked Up" && (
        <button
          onClick={() => advanceOrder(o.id)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-teal-600 px-2 py-2 text-xs font-medium text-white hover:bg-teal-700"
        >
          Move to {nextStatus(o.status)} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

export default function DispatchBoard({ orders, customers, advanceOrder, assignRider }) {
  const [mobileGroup, setMobileGroup] = useState(GROUPS[0].id);
  const [search, setSearch] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const activeOrders = orders.filter((o) => o.status !== "Cancelled" && matchesSearch(o, customers, search));
  const cancelledOrders = orders.filter((o) => o.status === "Cancelled" && matchesSearch(o, customers, search));

  function ordersFor(group) {
    return activeOrders.filter((o) => group.statuses.includes(o.status)).sort(byAge);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">Dispatch board</h1>
          <p className="mt-1 text-sm text-slate-500">Shared order record — attendant and rider move cards themselves, no retyping into a group chat.</p>
        </div>
        <div className="relative sm:w-64">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by customer or order ID…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
          />
        </div>
      </div>

      {/* Mobile: group filter + single list */}
      <div className="mt-4 md:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {GROUPS.map((g) => {
            const count = ordersFor(g).length;
            const active = mobileGroup === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setMobileGroup(g.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  active ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {g.label} · {count}
              </button>
            );
          })}
        </div>
        <div className="mt-2 space-y-2">
          {ordersFor(GROUPS.find((g) => g.id === mobileGroup)).length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Nothing here.</div>
          )}
          {ordersFor(GROUPS.find((g) => g.id === mobileGroup)).map((o) => (
            <OrderCard key={o.id} o={o} customers={customers} advanceOrder={advanceOrder} assignRider={assignRider} />
          ))}
        </div>
      </div>

      {/* Desktop: four wide stage columns, full page width, no horizontal scroll */}
      <div className="mt-4 hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
        {GROUPS.map((g) => {
          const groupOrders = ordersFor(g);
          return (
            <div key={g.id} className="min-w-0 rounded-xl bg-slate-100/60 p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-medium text-slate-700">{g.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{groupOrders.length}</span>
              </div>
              <div className="space-y-2">
                {groupOrders.map((o) => (
                  <OrderCard key={o.id} o={o} customers={customers} advanceOrder={advanceOrder} assignRider={assignRider} />
                ))}
                {groupOrders.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">Nothing here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancelled orders — collapsed by default, out of the way but not hidden */}
      {cancelledOrders.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <button
            onClick={() => setShowCancelled((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
          >
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <XCircle size={14} className="text-slate-400" /> Cancelled ({cancelledOrders.length})
            </span>
            {showCancelled ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showCancelled && (
            <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-3 sm:grid-cols-2 xl:grid-cols-4">
              {cancelledOrders.map((o) => (
                <div key={o.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm opacity-75">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{personName(customers, o.customerId)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{o.id}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.package}</Badge>
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.handover}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
