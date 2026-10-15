import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, MapPin, X } from "lucide-react";
import PickupRequestForm from "./PickupRequestForm.jsx";
import { DEFAULT_BRANCH } from "../data/seedData.js";
import { pickupAddressOf } from "../utils/helpers.js";

// Staff "New Order": picks the customer, then renders the SAME PickupRequestForm the customer uses,
// and submits through the same addOrder event so both feed the dispatch board identically.
export default function NewOrder({ customers, addOrder, prefillCustomerId, clearPrefill, goToRegister, goToBoard }) {
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (prefillCustomerId) {
      setCustomerId(prefillCustomerId);
      clearPrefill?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillCustomerId]);

  const customer = customers.find((c) => c.id === customerId) || null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.contact.replace(/\s/g, "").includes(q.replace(/\s/g, "")));
  }, [query, customers]);

  function submit(fields) {
    addOrder({
      customerId: customer.id, branchId: customer.branchId || DEFAULT_BRANCH, status: "New Request",
      weight: null, price: null, riderId: null, proofPhoto: false,
      paymentStatus: "Unpaid", gcashRef: "", delay: null, notes: "", ...fields,
    });
  }

  function reset() {
    setCustomerId(null);
    setQuery("");
    setFormKey((k) => k + 1);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-medium">New Order</h1>
      <p className="mt-1 text-sm text-slate-500">Same form and rules as the customer's "Schedule a pickup" — it lands on the dispatch board the same way.</p>

      <div className="mt-4 rounded-xl border-2 border-teal-200 bg-teal-50 p-3">
        <label htmlFor="no-search" className="text-xs font-semibold text-teal-900">Find a customer (name or contact number)</label>
        {customer ? (
          <div className="mt-1 flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-sm">
            <div>
              <div className="font-medium">{customer.name} · {customer.contact}</div>
              <div className="mt-0.5 flex items-start gap-1 text-xs text-slate-500"><MapPin size={12} className="mt-0.5 shrink-0" />{pickupAddressOf(customer)}</div>
            </div>
            <button onClick={reset} aria-label="Change customer" className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
        ) : (
          <>
            <div className="relative mt-1">
              <Search size={15} className="absolute left-2.5 top-3 text-slate-400" />
              <input
                id="no-search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Ana Reyes or 0917…"
                className="w-full rounded-lg border border-teal-300 bg-white py-2.5 pl-8 pr-3 text-sm"
              />
            </div>
            {query.trim() && (
              <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
                {matches.map((c) => (
                  <button key={c.id} onClick={() => setCustomerId(c.id)} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50">
                    <span>{c.name}</span>
                    <span className="text-xs text-slate-400">{c.contact}</span>
                  </button>
                ))}
                {matches.length === 0 && <div className="px-3 py-2.5 text-xs text-slate-400">No match.</div>}
                <button onClick={goToRegister} className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2.5 text-left text-teal-700 hover:bg-teal-50">
                  <UserPlus size={14} /> Not registered? Register a customer
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4">
        {customer ? (
          <PickupRequestForm
            key={`${customer.id}-${formKey}`}
            customer={customer}
            withChannel
            submitLabel="Create Order"
            successText="Order created and placed on the Dispatch Board."
            onSubmit={submit}
            onCancel={reset}
            onDone={() => { reset(); goToBoard?.(); }}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Search a customer above to start an order.</div>
        )}
      </div>
    </div>
  );
}
