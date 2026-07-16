import { useState } from "react";
import { UserPlus, CheckCircle2, PackagePlus } from "lucide-react";

const EMPTY_FORM = { name: "", contact: "", pickupAddr: "", deliveryAddr: "", paymentMode: "Cash", defaultPackage: "Deluxe" };

export default function CustomerRegistration({ customers, registerCustomer, goToNewOrderFor }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [registered, setRegistered] = useState(null);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.contact.trim()) e.contact = "Contact number is required";
    if (!form.pickupAddr.trim()) e.pickupAddr = "Pick-up address is required";
    const duplicate = customers.some(
      (c) => c.contact.replace(/\s/g, "") === form.contact.replace(/\s/g, "") && form.contact.trim()
    );
    if (duplicate) e.contact = "A customer with this contact number already exists";
    return e;
  }

  function submit(e) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const customer = {
      id: "c" + Math.random().toString(36).slice(2, 7),
      name: form.name.trim(),
      contact: form.contact.trim(),
      pickupAddr: form.pickupAddr.trim(),
      deliveryAddr: form.deliveryAddr.trim() || form.pickupAddr.trim(),
      paymentMode: form.paymentMode,
      defaultPackage: form.defaultPackage,
    };
    registerCustomer(customer);
    setRegistered(customer);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function registerAnother() {
    setRegistered(null);
  }

  if (registered) {
    return (
      <div className="max-w-lg">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="mt-3 text-base font-medium text-emerald-800">{registered.name} is registered</h2>
          <p className="mt-1 text-sm text-emerald-700">
            Saved to the customer directory — future orders will auto-fill their details, no digging through old chats.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => goToNewOrderFor(registered.id)}
              className="flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <PackagePlus size={15} /> Create their first order
            </button>
            <button
              onClick={registerAnother}
              className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserPlus size={15} /> Register another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2">
        <UserPlus size={18} className="text-teal-600" />
        <h1 className="text-lg font-medium">Register a customer</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Save a customer's details once so staff never have to ask for them again or dig through old chat history.
      </p>

      <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-600">Full name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Dela Cruz"
              className={`mt-1 w-full rounded-md border px-3 py-2.5 text-sm ${errors.name ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Contact number</label>
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="0917 000 0000"
              className={`mt-1 w-full rounded-md border px-3 py-2.5 text-sm ${errors.contact ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.contact && <p className="mt-1 text-xs text-rose-600">{errors.contact}</p>}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Pick-up address</label>
          <input
            value={form.pickupAddr}
            onChange={(e) => setForm({ ...form, pickupAddr: e.target.value })}
            placeholder="House/unit, street, barangay"
            className={`mt-1 w-full rounded-md border px-3 py-2.5 text-sm ${errors.pickupAddr ? "border-rose-300" : "border-slate-200"}`}
          />
          {errors.pickupAddr && <p className="mt-1 text-xs text-rose-600">{errors.pickupAddr}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Delivery address (optional)</label>
          <input
            value={form.deliveryAddr}
            onChange={(e) => setForm({ ...form, deliveryAddr: e.target.value })}
            placeholder="Leave blank if same as pick-up"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-600">Preferred payment mode</label>
            <select
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option>Cash</option>
              <option>GCash</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Default package</label>
            <select
              value={form.defaultPackage}
              onChange={(e) => setForm({ ...form, defaultPackage: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="Premium">Premium — ₱235</option>
              <option value="Deluxe">Deluxe — ₱210</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full rounded-md bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
          Register customer
        </button>
      </form>
    </div>
  );
}
