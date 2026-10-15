import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { newCustomerId, caps } from "../utils/helpers.js";
import { ADDRESS_FIELDS, EMPTY_ADDRESS, addressComplete, addressBlank } from "../utils/address.js";
import { DEFAULT_BRANCH } from "../data/seedData.js";

const EMPTY_FORM = {
  firstName: "", lastName: "", contact: "", pin: "", email: "",
  address: EMPTY_ADDRESS, deliveryAddress: EMPTY_ADDRESS, consent: false,
};

const inputCls = (err) => `mt-1 w-full rounded-md border px-3 py-2.5 text-sm uppercase ${err ? "border-rose-300" : "border-slate-200"}`;

export function AddressBlock({ title, hint, value, onChange, errors = {}, idPrefix, allRequired }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">{title}</legend>
      {hint && <p className="-mt-1 text-xs text-slate-400">{hint}</p>}
      {ADDRESS_FIELDS.map((f) => (
        <div key={f.key}>
          <label htmlFor={`${idPrefix}-${f.key}`} className="text-xs font-medium text-slate-600">
            {f.label}{allRequired && f.required ? " (Required)" : ""}
          </label>
          <input
            id={`${idPrefix}-${f.key}`}
            value={value[f.key]}
            onChange={(e) => onChange({ ...value, [f.key]: caps(e.target.value) })}
            className={inputCls(errors[f.key])}
          />
          {errors[f.key] && <p className="mt-1 text-xs text-rose-600">{errors[f.key]}</p>}
        </div>
      ))}
    </fieldset>
  );
}

// One registration form for BOTH the customer's self-registration and the staff "Register a customer"
// screen, so fields, rules and flow can never drift apart.
// `account` ({ email, pin, authProvider, firstName?, lastName? }) comes from the splash screen: the email and
// PIN (or Google sign-in) were already collected, so those fields are not asked again.
export default function RegistrationForm({ customers, onRegistered, submitLabel = "Register", account = null }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    firstName: account?.firstName || "",
    lastName: account?.lastName || "",
  });
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Please enter your first name";
    if (!form.lastName.trim()) e.lastName = "Please enter your last name";
    if (!form.contact.trim()) e.contact = "Please enter a contact number";
    else if (customers.some((c) => c.contact.replace(/\s/g, "") === form.contact.replace(/\s/g, ""))) {
      e.contact = "This number is already registered — the shop already has the details on file";
    }
    if (!account) {
      if (!/^\d{4}$/.test(form.pin)) e.pin = "PIN must be exactly 4 digits";
      const em = form.email.trim().toLowerCase();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) e.email = "Enter a valid email address";
      else if (em && customers.some((c) => c.email && c.email.toLowerCase() === em)) e.email = "This email is already registered";
    }
    const addrErr = {};
    ADDRESS_FIELDS.filter((f) => f.required).forEach((f) => { if (!form.address[f.key].trim()) addrErr[f.key] = "Required"; });
    if (Object.keys(addrErr).length) e.address = addrErr;
    if (!addressBlank(form.deliveryAddress) && !addressComplete(form.deliveryAddress)) {
      const d = {};
      ADDRESS_FIELDS.filter((f) => f.required).forEach((f) => { if (!form.deliveryAddress[f.key].trim()) d[f.key] = "Required"; });
      e.deliveryAddress = d;
    }
    if (!form.consent) e.consent = "Please confirm to continue";
    return e;
  }

  function submit(ev) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    const clean = (a) => Object.fromEntries(Object.entries(a).map(([k, val]) => [k, val.trim()]));
    const address = clean(form.address);
    const customer = {
      id: newCustomerId(),
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      contact: form.contact.trim(),
      email: account ? account.email.trim() : form.email.trim() || null,
      authProvider: account?.authProvider || "email",
      pin: account ? account.pin || "" : form.pin,
      address,
      deliveryAddress: addressBlank(form.deliveryAddress) ? null : clean(form.deliveryAddress),
      area: address.subdivision, branchId: DEFAULT_BRANCH, createdTs: Date.now(),
    };
    onRegistered(customer);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-first" className="text-xs font-medium text-slate-600">First name</label>
          <input id="reg-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: caps(e.target.value) })} placeholder="JUAN" className={inputCls(errors.firstName)} />
          {errors.firstName && <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="reg-last" className="text-xs font-medium text-slate-600">Last name</label>
          <input id="reg-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: caps(e.target.value) })} placeholder="DELA CRUZ" className={inputCls(errors.lastName)} />
          {errors.lastName && <p className="mt-1 text-xs text-rose-600">{errors.lastName}</p>}
        </div>
      </div>

      {account ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Signing up as <span className="font-medium text-slate-800">{account.email}</span>
          {account.authProvider === "google" && " (Google)"}
        </p>
      ) : (
        <div>
          <label htmlFor="reg-email" className="text-xs font-medium text-slate-600">Email (optional)</label>
          <input
            id="reg-email" type="email" inputMode="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@gmail.com" className={inputCls(errors.email).replace("uppercase", "")}
          />
          {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
        </div>
      )}

      <div>
        <label htmlFor="reg-contact" className="text-xs font-medium text-slate-600">Contact number</label>
        <input id="reg-contact" inputMode="tel" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="0917 000 0000" className={inputCls(errors.contact).replace("uppercase", "")} />
        {errors.contact && <p className="mt-1 text-xs text-rose-600">{errors.contact}</p>}
      </div>

      <AddressBlock
        title="Pick-up address"
        value={form.address}
        onChange={(address) => setForm({ ...form, address })}
        errors={errors.address}
        idPrefix="reg-pickup"
        allRequired
      />

      <AddressBlock
        title="Delivery address"
        hint="Leave blank if same as pick-up address."
        value={form.deliveryAddress}
        onChange={(deliveryAddress) => setForm({ ...form, deliveryAddress })}
        errors={errors.deliveryAddress}
        idPrefix="reg-delivery"
      />

      {!account && (
      <div>
        <label htmlFor="reg-pin" className="text-xs font-medium text-slate-600">4-digit PIN</label>
        <input
          id="reg-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password"
          value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
          placeholder="••••" className={inputCls(errors.pin).replace("uppercase", "") + " tracking-widest"}
        />
        <p className="mt-1 text-xs text-slate-400">The customer uses this with their email to log in.</p>
        {errors.pin && <p className="mt-1 text-xs text-rose-600">{errors.pin}</p>}
      </div>
      )}

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-0.5" />
        I agree that The Empress Laundry can use these details to process my pick-up, delivery, and payment.
      </label>
      {errors.consent && <p className="-mt-3 text-xs text-rose-600">{errors.consent}</p>}

      <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-3 text-sm font-medium text-white hover:bg-teal-700">
        {submitLabel} <ArrowRight size={15} />
      </button>
    </form>
  );
}
