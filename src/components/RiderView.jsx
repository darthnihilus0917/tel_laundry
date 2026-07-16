import { useState } from "react";
import { Camera, ArrowRight, CheckCircle2 } from "lucide-react";
import Badge from "./Badge.jsx";
import { RIDERS, PACKAGE_PRICE, STATUS_COLOR } from "../data/seedData.js";
import { nextStatus } from "../utils/helpers.js";

function PaymentCollectForm({ order, customer, onLog }) {
  const [method, setMethod] = useState(customer?.paymentMode || "Cash");
  const [ref, setRef] = useState("");
  const [logged, setLogged] = useState(false);
  const amount = order.price ?? PACKAGE_PRICE[order.package];

  if (logged) {
    return <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={12} /> Payment logged, pending verification.</div>;
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
      <div className="text-xs font-medium text-slate-600">Collect payment — ₱{amount}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-xs">
          <option>Cash</option>
          <option>GCash</option>
        </select>
        {method === "GCash" && (
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Last 4 digits of ref #" maxLength={4} className="w-32 rounded-md border border-slate-200 px-2 py-1 text-xs" />
        )}
        <button
          onClick={() => { onLog(method, ref); setLogged(true); }}
          disabled={method === "GCash" && ref.length < 4}
          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40"
        >
          Log payment
        </button>
      </div>
    </div>
  );
}

export default function RiderView({ orders, customers, advanceOrder, setOrders }) {
  const [riderId, setRiderId] = useState(RIDERS[0].id);
  const myJobs = orders.filter((o) => o.riderId === riderId && o.status !== "Completed");

  function attachPhoto(orderId) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, proofPhoto: true } : o)));
  }

  function logPayment(orderId, method, ref) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentMethod: method, gcashRef: ref, paymentStatus: "Pending Verification" } : o))
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium">Rider view</h1>
      <p className="mt-1 text-sm text-slate-500">Own job list — no waiting on the group chat for instructions.</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Viewing as:</span>
        <select value={riderId} onChange={(e) => setRiderId(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-sm">
          {RIDERS.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {myJobs.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">No active jobs assigned.</div>}
        {myJobs.map((o) => {
          const c = customers.find((cc) => cc.id === o.customerId);
          const isPickupPhase = ["Assigned for Pickup", "Picked Up"].includes(o.status);
          const isDeliveryPhase = ["Ready for Delivery", "Out for Delivery"].includes(o.status);
          return (
            <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c?.name} · {o.id}</div>
                  <div className="text-slate-500">{isPickupPhase ? c?.pickupAddr : c?.deliveryAddr}</div>
                </div>
                <Badge className={STATUS_COLOR[o.status]}>{o.status}</Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.handover} handover</Badge>
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.package}</Badge>
              </div>

              {o.handover === "Lobby" && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => attachPhoto(o.id)}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${o.proofPhoto ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Camera size={12} /> {o.proofPhoto ? "Photo attached" : "Attach reference/proof photo"}
                  </button>
                </div>
              )}

              {isDeliveryPhase && o.paymentStatus === "Unpaid" && (
                <PaymentCollectForm order={o} customer={c} onLog={(method, ref) => logPayment(o.id, method, ref)} />
              )}

              {nextStatus(o.status) && (
                <button
                  onClick={() => advanceOrder(o.id)}
                  className="mt-3 flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  {isPickupPhase ? "Mark picked up" : isDeliveryPhase ? "Mark delivered" : `Move to ${nextStatus(o.status)}`} <ArrowRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
