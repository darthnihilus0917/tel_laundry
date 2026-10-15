import { Clock, Package, Truck, MessageSquareWarning, Wallet, AlertTriangle } from "lucide-react";
import StatCard from "./StatCard.jsx";
import DailyMetrics from "./DailyMetrics.jsx";
import Badge from "./Badge.jsx";
import { personName, ageHours, ageLabel } from "../utils/helpers.js";

export default function Dashboard({ orders, complaints, customers, setTab }) {
  const pendingPickup = orders.filter((o) => ["New Request", "Assigned for Pickup"].includes(o.status)).length;
  const inShop = orders.filter((o) => o.status === "In Shop").length;
  const outForDelivery = orders.filter((o) => ["Ready for Delivery", "Out for Delivery"].includes(o.status)).length;
  const openTickets = complaints.filter((t) => t.status !== "Resolved").length;
  const pendingPayments = orders.filter((o) => o.paymentStatus === "Pending Verification").length;
  const delayed = orders.filter((o) => o.delay).length;

  // Exception queue (FR-7.2): things that need the owner, not routine work.
  const TICKET_SLA_HOURS = 4;
  const exceptions = [
    ...complaints
      .filter((t) => t.status !== "Resolved" && ageHours(t.createdTs) > TICKET_SLA_HOURS)
      .map((t) => ({ key: "t" + t.id, text: `Ticket open ${ageLabel(t.createdTs)} (over ${TICKET_SLA_HOURS}h SLA): ${t.message}` })),
    ...orders
      .filter((o) => o.paymentStatus === "Pending Verification" && ageHours(o.paymentTs) > 24)
      .map((o) => ({ key: "p" + o.id, text: `Payment for ${o.id} pending verification ${ageLabel(o.paymentTs)}` })),
    ...orders
      .filter((o) => o.delay && !o.delay.notified)
      .map((o) => ({ key: "d" + o.id, text: `${o.id} delayed — customer not yet notified` })),
    ...orders
      .filter((o) => ["Ready for Delivery", "Out for Delivery"].includes(o.status) && ageHours(o.createdTs) > 48)
      .map((o) => ({ key: "b" + o.id, text: `${o.id} delivery backlog — ordered ${ageLabel(o.createdTs)}` })),
  ];

  return (
    <div>
      <h1 className="text-lg font-medium">Owner dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">A monitoring view, not an action queue — day-to-day moves happen on the dispatch board, rider view, and complaints tab.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Pending pickups" value={pendingPickup} icon={Clock} tone="slate" />
        <StatCard label="In shop" value={inShop} icon={Package} tone="amber" />
        <StatCard label="Out for delivery" value={outForDelivery} icon={Truck} tone="teal" />
        <StatCard label="Open complaints" value={openTickets} icon={MessageSquareWarning} tone="rose" />
        <StatCard label="Payments to verify" value={pendingPayments} icon={Wallet} tone="purple" />
        <StatCard label="Delayed orders" value={delayed} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-rose-800"><AlertTriangle size={14} /> Exceptions ({exceptions.length})</h2>
        {exceptions.length === 0 && <div className="mt-2 text-sm text-rose-700/70">Nothing needs your attention.</div>}
        <ul className="mt-2 space-y-1 text-sm text-rose-800">
          {exceptions.map((e) => <li key={e.key}>• {e.text}</li>)}
        </ul>
      </div>

      <DailyMetrics orders={orders} customers={customers} />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Needs owner attention</h2>
            <button onClick={() => setTab("complaints")} className="text-xs text-teal-700 hover:underline">View complaints →</button>
          </div>
          <div className="mt-3 space-y-2">
            {complaints.filter((t) => t.status !== "Resolved").length === 0 && (
              <div className="text-sm text-slate-400">No open tickets right now.</div>
            )}
            {complaints
              .filter((t) => t.status !== "Resolved")
              .map((t) => (
                <div key={t.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-2.5 text-sm">
                  <div>
                    <div className="font-medium">{personName(customers, orders.find((o) => o.id === t.orderId)?.customerId)}</div>
                    <div className="text-slate-500">{t.message}</div>
                  </div>
                  <Badge className={t.status === "Open" ? "bg-rose-50 text-rose-700 border-rose-300" : "bg-amber-50 text-amber-700 border-amber-300"}>{t.status}</Badge>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Delayed orders</h2>
            <button onClick={() => setTab("board")} className="text-xs text-teal-700 hover:underline">View board →</button>
          </div>
          <div className="mt-3 space-y-2">
            {orders.filter((o) => o.delay).length === 0 && <div className="text-sm text-slate-400">Nothing delayed today.</div>}
            {orders
              .filter((o) => o.delay)
              .map((o) => (
                <div key={o.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-2.5 text-sm">
                  <div>
                    <div className="font-medium">{personName(customers, o.customerId)} · {o.id}</div>
                    <div className="text-slate-500">{o.delay.reason}</div>
                  </div>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-300">Next-day</Badge>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
