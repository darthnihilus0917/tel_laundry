import { useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Badge from "./Badge.jsx";
import { MAX_LOAD_KG, STATUS_COLOR } from "../data/seedData.js";
import { byAge, ageLabel, suggestPrice, packagesUnitPrice, packagesLabel } from "../utils/helpers.js";

function IntakeCard({ order, customer, updateOrder, advanceOrder }) {
  const [weight, setWeight] = useState(order.weight ?? "");
  const unit = packagesUnitPrice(order);
  const price = suggestPrice(order, weight);
  const over = Number(weight) > MAX_LOAD_KG && (order.packages || []).length === 1;

  function logAndQueue() {
    advanceOrder(order.id, { weight: Number(weight), price });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-medium">{customer?.name} · {order.id}</div>
        <span className="text-xs text-slate-400">{ageLabel(order.createdTs)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{packagesLabel(order)} · ₱{unit}/load</Badge>
        <Badge className={STATUS_COLOR[order.status]}>{order.status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
          placeholder="Weight (kg)" className="w-32 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />
        <span className="text-slate-600">{price ? `₱${price}` : "—"}</span>
        <button
          onClick={logAndQueue} disabled={!price}
          className="flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-40"
        >
          Log &amp; queue for wash <ArrowRight size={12} />
        </button>
      </div>
      {over && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
          <AlertTriangle size={12} /> Over {MAX_LOAD_KG}kg — billed as {Math.ceil(Number(weight) / MAX_LOAD_KG)} loads.
        </div>
      )}
    </div>
  );
}

function ShopCard({ order, customer, updateOrder, advanceOrder }) {
  const [reason, setReason] = useState("");
  const [eta, setEta] = useState("Tomorrow");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-medium">{customer?.name} · {order.id}</div>
        <span className="text-xs text-slate-400">{ageLabel(order.createdTs)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{order.weight}kg · ₱{order.price}</Badge>
        {order.delay && <Badge className="bg-amber-50 text-amber-700 border-amber-300">Next-day · ETA {order.delay.eta}</Badge>}
      </div>
      {order.delay ? (
        <div className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          {order.delay.reason}
          <div className="mt-1.5 flex flex-wrap gap-3">
            {!order.delay.notified && (
              <button onClick={() => updateOrder(order.id, { delay: { ...order.delay, notified: true } })} className="font-medium underline">
                Mark customer notified
              </button>
            )}
            {order.delay.notified && <span>Customer notified ✓</span>}
            <button onClick={() => updateOrder(order.id, { delay: null })} className="underline">Clear delay</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Delay reason (e.g. machine volume)" className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
          <input value={eta} onChange={(e) => setEta(e.target.value)} placeholder="New ETA" className="w-32 rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
          <button
            disabled={!reason.trim()}
            onClick={() => updateOrder(order.id, { delay: { reason: reason.trim(), eta, notified: false } })}
            className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-40"
          >
            Flag next-day
          </button>
        </div>
      )}
      <button onClick={() => advanceOrder(order.id)} className="mt-3 flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">
        Mark ready for delivery <ArrowRight size={12} />
      </button>
    </div>
  );
}

export default function Attendant({ orders, customers, advanceOrder, updateOrder }) {
  const intake = orders.filter((o) => o.status === "Picked Up").sort(byAge);
  const inShop = orders.filter((o) => o.status === "In Shop").sort(byAge);
  const cust = (o) => customers.find((c) => c.id === o.customerId);

  return (
    <div>
      <h1 className="text-lg font-medium">Attendant — shop queue</h1>
      <p className="mt-1 text-sm text-slate-500">FIFO: oldest orders first. Weigh incoming loads, then work the wash → dry → fold queue.</p>

      <h2 className="mt-5 text-sm font-medium text-slate-700">Awaiting intake ({intake.length})</h2>
      <div className="mt-2 space-y-3">
        {intake.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">Nothing waiting to be weighed.</div>}
        {intake.map((o) => <IntakeCard key={o.id} order={o} customer={cust(o)} updateOrder={updateOrder} advanceOrder={advanceOrder} />)}
      </div>

      <h2 className="mt-6 text-sm font-medium text-slate-700">In shop ({inShop.length})</h2>
      <div className="mt-2 space-y-3">
        {inShop.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">Queue is empty.</div>}
        {inShop.map((o) => <ShopCard key={o.id} order={o} customer={cust(o)} updateOrder={updateOrder} advanceOrder={advanceOrder} />)}
      </div>
    </div>
  );
}
