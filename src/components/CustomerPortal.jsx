import { useState } from "react";
import { Package, CheckCircle2, ShieldCheck, Clock, Truck, ArrowRight, LogIn, Search } from "lucide-react";
import { PACKAGE_PRICE } from "../data/seedData.js";

const EMPTY_FORM = {
  name: "", contact: "", pickupAddr: "", deliveryAddr: "",
  paymentMode: "Cash", defaultPackage: "Deluxe", consent: false,
};

export default function CustomerPortal({ customers, registerCustomer, onStaffLogin, onGoToAccount }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [registered, setRegistered] = useState(null);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Please enter your full name";
    if (!form.contact.trim()) e.contact = "Please enter a contact number";
    if (!form.pickupAddr.trim()) e.pickupAddr = "Please enter your pick-up address";
    if (!form.consent) e.consent = "Please confirm to continue";
    const duplicate = customers.some(
      (c) => form.contact.trim() && c.contact.replace(/\s/g, "") === form.contact.replace(/\s/g, "")
    );
    if (duplicate) e.contact = "This number is already registered — the shop already has your details on file";
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
    registerCustomer(customer, { silent: true });
    setRegistered(customer);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Package size={18} />
            </div>
            <span className="text-sm font-medium">TEL Laundry</span>
          </div>
          <button
            onClick={onStaffLogin}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogIn size={13} /> Staff login
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {!registered ? (
          <>
            <button
              onClick={onGoToAccount}
              className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-teal-600 bg-teal-50 px-4 py-4 text-left shadow-sm hover:bg-teal-100 sm:px-5 sm:py-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                  <Search size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-teal-900 sm:text-base">Already a customer?</div>
                  <div className="text-xs text-teal-700 sm:text-sm">Tap here to check your laundry status or schedule a pickup</div>
                </div>
              </div>
              <ArrowRight size={20} className="shrink-0 text-teal-600" />
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or register below if you're new</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-medium sm:text-3xl">Welcome to TEL Laundry</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Register once and we'll have your details on hand for every pick-up — no more repeating your address every time you message us.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center sm:p-4">
                <Clock size={18} className="mx-auto text-teal-600" />
                <div className="mt-1.5 text-xs font-medium sm:text-sm">Same-day service</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center sm:p-4">
                <Truck size={18} className="mx-auto text-teal-600" />
                <div className="mt-1.5 text-xs font-medium sm:text-sm">Pick-up & delivery</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center sm:p-4">
                <ShieldCheck size={18} className="mx-auto text-teal-600" />
                <div className="mt-1.5 text-xs font-medium sm:text-sm">Cash or GCash</div>
              </div>
            </div>

            <form onSubmit={submit} noValidate className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <h2 className="text-sm font-medium text-slate-700">Your details</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <p className="mt-1 text-xs text-slate-400">For condo/apartment lobby drop-offs, just note the building — you can send a photo when you book a pick-up.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Delivery address (if different)</label>
                <input
                  value={form.deliveryAddr}
                  onChange={(e) => setForm({ ...form, deliveryAddr: e.target.value })}
                  placeholder="Leave blank if same as pick-up"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <label className="text-xs font-medium text-slate-600">Preferred package</label>
                  <select
                    value={form.defaultPackage}
                    onChange={(e) => setForm({ ...form, defaultPackage: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="Premium">Premium — ₱{PACKAGE_PRICE.Premium}/load</option>
                    <option value="Deluxe">Deluxe — ₱{PACKAGE_PRICE.Deluxe}/load</option>
                  </select>
                </div>
              </div>
              <p className="-mt-2 text-xs text-slate-400">Max 8kg per load. You can change this anytime you message us.</p>

              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-0.5"
                />
                I agree that TEL Laundry can use these details to process my pick-up, delivery, and payment.
              </label>
              {errors.consent && <p className="-mt-2 text-xs text-rose-600">{errors.consent}</p>}

              <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-3 text-sm font-medium text-white hover:bg-teal-700">
                Register <ArrowRight size={15} />
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-400">
              Already registered? <button onClick={onGoToAccount} className="text-teal-700 underline">Go to your account</button> to schedule a pickup or check status.
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="mt-3 text-lg font-medium text-emerald-800">You're registered, {registered.name.split(" ")[0]}!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-emerald-700">
              We've saved your details. Head to your account anytime to schedule a pickup or check on your laundry's status.
            </p>
            <button
              onClick={onGoToAccount}
              className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Go to my account <ArrowRight size={14} />
            </button>
            <button
              onClick={() => { setRegistered(null); setForm(EMPTY_FORM); }}
              className="mt-5 rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Register another customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
