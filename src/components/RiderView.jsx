import { useState } from "react";
import { ArrowRight, CheckCircle2, MapPin, AlertTriangle } from "lucide-react";
import PhotoAttach from "./PhotoAttach.jsx";
import Badge from "./Badge.jsx";
import { RIDERS, PACKAGE_PRICE, STATUS_COLOR } from "../data/seedData.js";
import { nextStatus, advanceBlockReason, areaOf, byAge, ageHours, ageLabel } from "../utils/helpers.js";

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

export default function RiderView({ orders, customers, advanceOrder, updateOrder }) {
  const [riderId, setRiderId] = useState(RIDERS[0].id);
  // In-shop work belongs to the attendant; riders only see pickup/delivery/payment jobs. Oldest first (FIFO).
  const myJobs = orders
    .filter((o) => o.riderId === riderId && !["Completed", "Cancelled", "In Shop", "New Request", "Payment Verification"].includes(o.status))
    .sort(byAge);

  function logPayment(orderId, method, ref) {
    updateOrder(orderId, { paymentMethod: method, gcashRef: ref, paymentStatus: "Pending Verification", paymentTs: Date.now() });
  }

  const isPickup = (o) => ["Assigned for Pickup", "Picked Up"].includes(o.status);
  const areaFor = (o) => {
    const c = customers.find((cc) => cc.id === o.customerId);
    return areaOf(isPickup(o) ? c?.pickupAddr : c?.deliveryAddr);
  };
  // Group jobs by area so the rider can run one route per area.
  const groups = myJobs.reduce((acc, o) => {
    const a = areaFor(o);
    (acc[a] = acc[a] || []).push(o);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-lg font-medium">Rider view</h1>
      <p className="mt-1 text-sm text-slate-500">Own job list, grouped by area, oldest first — no waiting on the group chat for instructions.</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Viewing as:</span>
        <select value={riderId} onChange={(e) => setRiderId(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-sm">
          {RIDERS.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-5">
        {myJobs.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">No active jobs assigned.</div>}
        {Object.entries(groups).map(([area, jobs]) => (
          <div key={area}>
            <div className="mb-2 flex items-center gap-1 text-xs font-medium uppercase text-slate-500"><MapPin size={12} /> {area} · {jobs.length}</div>
            <div className="space-y-3">
              {jobs.map((o) => {
                const c = customers.find((cc) => cc.id === o.customerId);
                const isPickupPhase = isPickup(o);
                const isDeliveryPhase = ["Ready for Delivery", "Out for Delivery", "Delivered"].includes(o.status);
                const blocked = advanceBlockReason(o);
                const backlog = isDeliveryPhase && o.status !== "Delivered" && ageHours(o.createdTs) > 24;
                return (
                  <div key={o.id} className={`rounded-xl border bg-white p-4 text-sm ${backlog ? "border-amber-300" : "border-slate-200"}`}>
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
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">{ageLabel(o.createdTs)}</Badge>
                    </div>

                    {backlog && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle size={12} /> Backlog — deliver this first</div>
                    )}

                    {o.handover === "Lobby" && isPickupPhase && (
                      <PhotoAttach label="bag reference photo" url={o.refPhoto} onChange={(url) => updateOrder(o.id, { refPhoto: url })} />
                    )}
                    {o.handover === "Lobby" && isDeliveryPhase && (
                      <PhotoAttach label="proof-of-delivery photo" url={o.proofPhotoUrl} onChange={(url) => updateOrder(o.id, { proofPhotoUrl: url, proofPhoto: true })} />
                    )}

                    {isDeliveryPhase && o.paymentStatus === "Unpaid" && (
                      <PaymentCollectForm order={o} customer={c} onLog={(method, ref) => logPayment(o.id, method, ref)} />
                    )}

                    {blocked && <div className="mt-2 text-xs text-slate-400">{blocked}</div>}
                    {nextStatus(o.status) && o.status !== "Picked Up" && (
                      <button
                        onClick={() => advanceOrder(o.id)}
                        className="mt-3 flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                      >
                        {o.status === "Assigned for Pickup" ? "Mark picked up" : o.status === "Delivered" ? "Send for payment verification" : o.status === "Ready for Delivery" ? "Start delivery" : "Mark delivered"} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
