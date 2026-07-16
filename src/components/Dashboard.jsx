import { Clock, Package, Truck, MessageSquareWarning, Wallet, AlertTriangle } from "lucide-react";
import StatCard from "./StatCard.jsx";
import Badge from "./Badge.jsx";
import { personName } from "../utils/helpers.js";

export default function Dashboard({ orders, complaints, customers, setTab }) {
  const pendingPickup = orders.filter((o) => ["New Request", "Assigned for Pickup"].includes(o.status)).length;
  const inShop = orders.filter((o) => o.status === "In Shop").length;
  const outForDelivery = orders.filter((o) => ["Ready for Delivery", "Out for Delivery"].includes(o.status)).length;
  const openTickets = complaints.filter((t) => t.status !== "Resolved").length;
  const pendingPayments = orders.filter((o) => o.paymentStatus === "Pending Verification").length;
  const delayed = orders.filter((o) => o.delay).length;

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
