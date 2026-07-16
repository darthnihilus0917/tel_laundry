import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle2, Plus, UserPlus } from "lucide-react";

export default function NewOrder({ customers, addOrder, prefillCustomerId, clearPrefill, goToRegister }) {
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({
    name: "", contact: "", pickupAddr: "", deliveryAddr: "",
    paymentMode: "Cash", pkg: "Deluxe", handover: "Personal", channel: "Text",
  });
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    if (!prefillCustomerId) return;
    const c = customers.find((cc) => cc.id === prefillCustomerId);
    if (c) {
      setSelectedCustomerId(c.id);
      setIsNew(false);
      setForm((f) => ({ ...f, name: c.name, contact: c.contact, pickupAddr: c.pickupAddr, deliveryAddr: c.deliveryAddr, paymentMode: c.paymentMode, pkg: c.defaultPackage }));
      setQuery(c.name);
    }
    clearPrefill?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillCustomerId]);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.contact.includes(q));
  }, [query, customers]);

  function pickCustomer(c) {
    setSelectedCustomerId(c.id);
    setIsNew(false);
    setForm((f) => ({ ...f, name: c.name, contact: c.contact, pickupAddr: c.pickupAddr, deliveryAddr: c.deliveryAddr, paymentMode: c.paymentMode, pkg: c.defaultPackage }));
    setQuery(c.name);
  }

  function startNew() {
    setSelectedCustomerId(null);
    setIsNew(true);
    setForm({ name: query, contact: "", pickupAddr: "", deliveryAddr: "", paymentMode: "Cash", pkg: "Deluxe", handover: "Personal", channel: "Text" });
  }

  function submit(e) {
    e.preventDefault();
    let customerId = selectedCustomerId;
    let newCustomer = null;
    if (isNew || !customerId) {
      customerId = "c" + Math.random().toString(36).slice(2, 7);
      newCustomer = {
        id: customerId, name: form.name, contact: form.contact,
        pickupAddr: form.pickupAddr, deliveryAddr: form.deliveryAddr || form.pickupAddr,
        paymentMode: form.paymentMode, defaultPackage: form.pkg,
      };
    }
    const order = {
      id: "o" + Math.floor(1000 + Math.random() * 9000),
      customerId, status: "New Request", package: form.pkg, weight: null, price: null,
      handover: form.handover, channel: form.channel, riderId: null,
      proofPhoto: false, paymentStatus: "Unpaid", paymentMethod: form.paymentMode,
      gcashRef: "", delay: null, createdAt: "Just now", notes: "",
    };
    addOrder(order, newCustomer);
    setSubmitted(order.id);
    setQuery(""); setSelectedCustomerId(null); setIsNew(false);
    setForm({ name: "", contact: "", pickupAddr: "", deliveryAddr: "", paymentMode: "Cash", pkg: "Deluxe", handover: "Personal", channel: "Text" });
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-medium">New order</h1>
      <p className="mt-1 text-sm text-slate-500">Look up an existing customer or register a new one — creates the order record directly, no group chat retyping.</p>

      {submitted && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Order {submitted} created and placed on the dispatch board.
        </div>
      )}

      <div className="mt-4">
        <label className="text-xs font-medium text-slate-600">Search customer by name or contact</label>
        <div className="relative mt-1">
          <Search size={15} className="absolute left-2.5 top-3 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedCustomerId(null); setIsNew(false); }}
            placeholder="e.g. Ana Reyes or 0917…"
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-8 pr-3 text-sm"
          />
        </div>
        {query && !selectedCustomerId && !isNew && (
          <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
            {matches.map((c) => (
              <button key={c.id} onClick={() => pickCustomer(c)} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50">
                <span>{c.name}</span>
                <span className="text-xs text-slate-400">{c.contact}</span>
              </button>
            ))}
            <button onClick={startNew} className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2.5 text-left text-teal-700 hover:bg-teal-50">
              <Plus size={14} /> Quick-add "{query}" for this order
            </button>
            {goToRegister && (
              <button onClick={goToRegister} className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2.5 text-left text-slate-500 hover:bg-slate-50">
                <UserPlus size={14} /> Or go to the full registration form
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        {(selectedCustomerId || isNew) && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Full name</label>
                <input required disabled={!isNew} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Contact number</label>
                <input required disabled={!isNew} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-50" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Pick-up address</label>
                <input required disabled={!isNew} value={form.pickupAddr} onChange={(e) => setForm({ ...form, pickupAddr: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Delivery address</label>
                <input disabled={!isNew} placeholder="Same as pickup" value={form.deliveryAddr} onChange={(e) => setForm({ ...form, deliveryAddr: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Package</label>
                <select value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                  <option value="Premium">Premium — ₱235</option>
                  <option value="Deluxe">Deluxe — ₱210</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Payment mode</label>
                <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                  <option>Cash</option>
                  <option>GCash</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Handover method</label>
                <select value={form.handover} onChange={(e) => setForm({ ...form, handover: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                  <option>Personal</option>
                  <option>Lobby</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Request channel</label>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                <option>Text</option>
                <option>Viber</option>
                <option>Messenger</option>
              </select>
            </div>

            <button type="submit" className="mt-2 w-full rounded-md bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
              Create order
            </button>
          </>
        )}
        {!selectedCustomerId && !isNew && <div className="text-sm text-slate-400">Search a customer above to start an order.</div>}
      </form>
    </div>
  );
}
