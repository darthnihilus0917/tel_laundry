import { useState } from "react";
import { ArrowRight, CheckCircle2, MapPin, AlertTriangle, Phone, Undo2, XCircle, Play } from "lucide-react";
import PhotoAttach from "./PhotoAttach.jsx";
import Badge from "./Badge.jsx";
import ReasonModal from "./ReasonModal.jsx";
import { RIDERS, STATUS_COLOR, HANDOVER, ABORTABLE_STATUSES } from "../data/seedData.js";
import {
  nextStatus, advanceBlockReason, routeArea, byAge, ageHours, ageLabel,
  packagesLabel, packagesUnitPrice, pickupAddressOf, deliveryAddressOf,
} from "../utils/helpers.js";

function FinalAmount({ order, onSave }) {
  const [value, setValue] = useState(order.price ?? "");
  const n = Number(value);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="text-xs font-medium text-slate-600" htmlFor={`amt-${order.id}`}>Final amount (₱)</label>
      <input
        id={`amt-${order.id}`} type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)}
        placeholder={`e.g. ${packagesUnitPrice(order)}`}
        className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs"
      />
      <button
        onClick={() => onSave(n)} disabled={!(n > 0) || n === order.price}
        className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40"
      >
        Save amount
      </button>
      {order.price != null && <span className="text-xs text-emerald-700">Customer sees ₱{order.price} · Final</span>}
    </div>
  );
}

function PaymentCollectForm({ order, onLog }) {
  const [method, setMethod] = useState(order.paymentMethod || "Cash");
  const [ref, setRef] = useState("");
  const [logged, setLogged] = useState(false);
  const amount = order.price ?? packagesUnitPrice(order);

  if (logged) {
    return <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={12} /> Payment logged, pending verification.</div>;
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
      <div className="text-xs font-medium text-slate-600">
        Collect payment — ₱{amount}{order.paymentStatus === "Shortage Logged" && <span className="text-red-600"> (short ₱{order.shortage} — re-log what was collected)</span>}
      </div>
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

export default function RiderView({ orders, customers, advanceOrder, updateOrder, setOrderOutcome, resumeOrder }) {
  const [riderId, setRiderId] = useState(RIDERS[0].id);
  const [reasonFor, setReasonFor] = useState(null); // { orderId, kind }
  // In-shop work belongs to the attendant; riders only see pickup/delivery/payment jobs. Oldest first (FIFO).
  const myJobs = orders
    .filter((o) => o.riderId === riderId && !["Completed", "Cancelled", "In Shop", "New Request", "Payment Verification"].includes(o.status))
    .sort(byAge);

  function logPayment(orderId, method, ref) {
    updateOrder(orderId, { paymentMethod: method, gcashRef: ref, paymentStatus: "Pending Verification", paymentTs: Date.now(), shortage: null, rejectReason: "" });
  }

  const isPickup = (o) => ["Assigned for Pickup", "Picked Up", "Rider Will Return"].includes(o.status);
  const areaFor = (o) => routeArea(customers.find((cc) => cc.id === o.customerId), isPickup(o));
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
                const lobby = o.handover === HANDOVER.LOBBY;
                const blocked = advanceBlockReason(o);
                const backlog = isDeliveryPhase && o.status !== "Delivered" && ageHours(o.createdTs) > 24;
                const needsCollect = isDeliveryPhase && !lobby && ["Unpaid", "Shortage Logged"].includes(o.paymentStatus);
                return (
                  <div key={o.id} className={`rounded-xl border bg-white p-4 text-sm ${backlog ? "border-amber-300" : "border-slate-200"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{c?.name} · {o.id}</div>
                        <div className="text-slate-500">{isPickupPhase ? pickupAddressOf(c) : deliveryAddressOf(c)}</div>
                        {c?.contact && <a href={`tel:${c.contact.replace(/\s/g, "")}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-teal-700"><Phone size={11} />{c.contact}</a>}
                      </div>
                      <Badge className={STATUS_COLOR[o.status]}>{o.status}</Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.handover}</Badge>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">{packagesLabel(o)}</Badge>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">{ageLabel(o.createdTs)}</Badge>
                      {o.pickupSlot && <Badge className="bg-slate-100 text-slate-600 border-slate-200">{o.pickupDate} · {o.pickupSlot}</Badge>}
                    </div>

                    {(o.packages || []).some((p) => p.instruction) && (
                      <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                        {o.packages.filter((p) => p.instruction).map((p) => <li key={p.id}>• {p.id}: {p.instruction}</li>)}
                      </ul>
                    )}

                    {o.status === "Rider Will Return" && o.returnReason && (
                      <div className="mt-2 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700">Unsuccessful pickup: {o.returnReason}</div>
                    )}

                    {backlog && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle size={12} /> Backlog — deliver this first</div>
                    )}

                    {lobby && isPickupPhase && (
                      o.bagPhoto ? (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                          <img src={o.bagPhoto} alt="Customer's bag/basket" className="h-14 w-14 rounded-md border border-slate-200 object-cover" />
                          Customer's bag/basket photo — pick up this one
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-400">No bag photo on file</div>
                      )
                    )}
                    {lobby && isDeliveryPhase && (
                      <PhotoAttach label="proof-of-delivery photo" url={o.proofPhotoUrl} onChange={(url) => updateOrder(o.id, { proofPhotoUrl: url, proofPhoto: true })} />
                    )}

                    {(isPickupPhase || isDeliveryPhase) && o.status !== "Delivered" && (
                      <FinalAmount order={o} onSave={(amt) => updateOrder(o.id, { price: amt })} />
                    )}

                    {needsCollect && <PaymentCollectForm order={o} onLog={(method, ref) => logPayment(o.id, method, ref)} />}

                    {blocked && <div className="mt-2 text-xs text-slate-400">{blocked}</div>}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextStatus(o.status) && o.status !== "Picked Up" && o.status !== "Rider Will Return" && (
                        <button
                          onClick={() => advanceOrder(o.id)}
                          className="flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                        >
                          {o.status === "Assigned for Pickup" ? "Mark picked up" : o.status === "Delivered" ? "Send for payment verification" : o.status === "Ready for Delivery" ? "Start delivery" : "Mark delivered"} <ArrowRight size={12} />
                        </button>
                      )}
                      {o.status === "Rider Will Return" && (
                        <button onClick={() => resumeOrder(o.id)} className="flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">
                          <Play size={12} /> Resume pickup
                        </button>
                      )}
                      {o.status === "Assigned for Pickup" && (
                        <button onClick={() => setReasonFor({ orderId: o.id, kind: "return" })} className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          <Undo2 size={12} /> Rider will return
                        </button>
                      )}
                      {ABORTABLE_STATUSES.includes(o.status) && (
                        <button onClick={() => setReasonFor({ orderId: o.id, kind: "cancel" })} className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          <XCircle size={12} /> Cancel order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {reasonFor && (
        <ReasonModal
          kind={reasonFor.kind}
          onClose={() => setReasonFor(null)}
          onConfirm={(reason) => { setOrderOutcome(reasonFor.orderId, reasonFor.kind, reason); setReasonFor(null); }}
        />
      )}
    </div>
  );
}
