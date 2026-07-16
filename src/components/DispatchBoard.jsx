import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Badge from "./Badge.jsx";
import { RIDERS, STATUS_FLOW, STATUS_COLOR } from "../data/seedData.js";
import { nextStatus, personName } from "../utils/helpers.js";

function OrderCard({ o, customers, advanceOrder, assignRider }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{personName(customers, o.customerId)}</span>
        <span className="text-xs text-slate-400">{o.id}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.package}</Badge>
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.handover}</Badge>
        {o.delay && <Badge className="bg-amber-50 text-amber-700 border-amber-300">Next-day</Badge>}
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
      {o.riderId && <div className="mt-1 text-xs text-slate-500">Rider: {personName(RIDERS, o.riderId)}</div>}
      {nextStatus(o.status) && o.status !== "New Request" && (
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
  const [mobileFilter, setMobileFilter] = useState(STATUS_FLOW[0]);

  return (
    <div>
      <h1 className="text-lg font-medium">Dispatch board</h1>
      <p className="mt-1 text-sm text-slate-500">Shared order record — attendant and rider move cards themselves, no retyping into a group chat.</p>

      {/* Mobile: status filter + single list */}
      <div className="mt-4 md:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            const active = mobileFilter === s;
            return (
              <button
                key={s}
                onClick={() => setMobileFilter(s)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  active ? "border-teal-600 bg-teal-600 text-white" : `border-slate-200 ${STATUS_COLOR[s]}`
                }`}
              >
                {s} · {count}
              </button>
            );
          })}
        </div>
        <div className="mt-2 space-y-2">
          {orders.filter((o) => o.status === mobileFilter).length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Nothing here.</div>
          )}
          {orders.filter((o) => o.status === mobileFilter).map((o) => (
            <OrderCard key={o.id} o={o} customers={customers} advanceOrder={advanceOrder} assignRider={assignRider} />
          ))}
        </div>
      </div>

      {/* Desktop: full kanban */}
      <div className="mt-4 hidden gap-3 overflow-x-auto pb-4 md:flex">
        {STATUS_FLOW.map((col) => {
          const colOrders = orders.filter((o) => o.status === col);
          return (
            <div key={col} className="w-64 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-slate-600">{col}</span>
                <span className="text-xs text-slate-400">{colOrders.length}</span>
              </div>
              <div className="space-y-2">
                {colOrders.map((o) => (
                  <OrderCard key={o.id} o={o} customers={customers} advanceOrder={advanceOrder} assignRider={assignRider} />
                ))}
                {colOrders.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-300">Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
