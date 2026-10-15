import { useState } from "react";
import { Package, CheckCircle2, ArrowRight, Mail, ShieldCheck, Truck, Wallet } from "lucide-react";
import RegistrationForm from "./RegistrationForm.jsx";
import GoogleAccountDialog from "./GoogleAccountDialog.jsx";
import { IS_API } from "../api.js";

// Customer splash screen: brand on top, "Log in" / "Register" below it. Both offer Google (Gmail)
// single sign-on or email + a 4-digit PIN. Staff entry is deliberately not linked from here (open /#staff).

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const norm = (v) => v.trim().toLowerCase();

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function GoogleButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={IS_API}
      title={IS_API ? "Google sign-in is not set up on the server yet" : undefined}
      className="flex w-full items-center justify-center gap-2.5 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GoogleMark /> {label}
    </button>
  );
}

const fieldCls = (err) => `mt-1 w-full rounded-md border px-3 py-2.5 text-sm ${err ? "border-rose-300" : "border-slate-200"}`;

function LoginForm({ customers, onSignedIn, onSignIn, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!isEmail(email) || !/^\d{4}$/.test(pin)) {
      setError("Enter your email and your 4-digit PIN.");
      return;
    }
    setBusy(true);
    const found = onSignIn
      ? await onSignIn(email, pin)
      : customers.find((c) => c.email && norm(c.email) === norm(email) && c.pin === pin) || null;
    setBusy(false);
    if (found) onSignedIn(found);
    else setError("That email and PIN don't match.");
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <label htmlFor="login-email" className="text-xs font-medium text-slate-600">Email</label>
        <input
          id="login-email" type="email" autoComplete="email" inputMode="email" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="you@gmail.com" className={fieldCls(error)}
        />
      </div>
      <div>
        <label htmlFor="login-pin" className="text-xs font-medium text-slate-600">4-digit PIN</label>
        <input
          id="login-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="current-password" value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="••••" className={fieldCls(error) + " tracking-widest"}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-600">
          {error} <button type="button" onClick={onGoRegister} className="underline">New here? Register</button>
        </p>
      )}
      <button type="submit" disabled={busy} className="w-full rounded-md bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60">
        Log in
      </button>
    </form>
  );
}

function RegisterStart({ customers, onContinue }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [errors, setErrors] = useState({});

  function submit(e) {
    e.preventDefault();
    const v = {};
    if (!isEmail(email)) v.email = "Enter a valid email address";
    else if (customers.some((c) => c.email && norm(c.email) === norm(email))) v.email = "This email is already registered — please log in";
    if (!/^\d{4}$/.test(pin)) v.pin = "PIN must be exactly 4 digits";
    else if (pin !== pin2) v.pin2 = "PINs don't match";
    setErrors(v);
    if (Object.keys(v).length === 0) onContinue({ email: email.trim(), pin, authProvider: "email" });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <label htmlFor="su-email" className="text-xs font-medium text-slate-600">Email</label>
        <input
          id="su-email" type="email" autoComplete="email" inputMode="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className={fieldCls(errors.email)}
        />
        {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="su-pin" className="text-xs font-medium text-slate-600">Create 4-digit PIN</label>
          <input
            id="su-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••"
            className={fieldCls(errors.pin) + " tracking-widest"}
          />
          {errors.pin && <p className="mt-1 text-xs text-rose-600">{errors.pin}</p>}
        </div>
        <div>
          <label htmlFor="su-pin2" className="text-xs font-medium text-slate-600">Confirm PIN</label>
          <input
            id="su-pin2" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} placeholder="••••"
            className={fieldCls(errors.pin2) + " tracking-widest"}
          />
          {errors.pin2 && <p className="mt-1 text-xs text-rose-600">{errors.pin2}</p>}
        </div>
      </div>
      <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
        Create account <ArrowRight size={15} />
      </button>
    </form>
  );
}

export default function CustomerPortal({ customers, registerCustomer, onSignedIn, onSignIn }) {
  const [tab, setTab] = useState("login"); // login | register
  const [pending, setPending] = useState(null); // account details collected before the profile step
  const [registered, setRegistered] = useState(null);
  const [googleOpen, setGoogleOpen] = useState(false);

  // Google (demo): a known Gmail address signs straight in; a new one continues to the profile step.
  function handleGoogle(profile) {
    setGoogleOpen(false);
    const existing = customers.find((c) => c.email && norm(c.email) === norm(profile.email));
    if (existing) onSignedIn(existing);
    else setPending({ email: profile.email, authProvider: "google", firstName: profile.firstName, lastName: profile.lastName });
  }

  const header = (
    <div className="text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-600 text-white shadow-lg shadow-teal-600/30">
        <Package size={38} />
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">The Empress Laundry</h1>
      <p className="mt-1 text-sm font-medium text-teal-700">Pick-Up &amp; Delivery</p>
      <p className="mx-auto mt-3 max-w-xs text-sm text-slate-500">
        Full laundry service, up to 8kg per load — we collect it and bring it back clean.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-slate-600">
        <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm"><Truck size={12} className="text-teal-600" /> Free pick-up &amp; delivery</span>
        <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm"><Wallet size={12} className="text-teal-600" /> Cash or GCash</span>
        <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm"><ShieldCheck size={12} className="text-teal-600" /> Same-day when we can</span>
      </div>
    </div>
  );

  // ---- step 2: profile (name, contact, addresses) — email + PIN/Google already known
  if (pending && !registered) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-slate-50">
        <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-2xl font-medium">Almost there</h1>
            <p className="mt-1 text-sm text-slate-500">Tell us where to pick up and deliver your laundry.</p>
          </div>
          <div className="mt-5">
            <RegistrationForm
              customers={customers}
              account={pending}
              submitLabel="Finish registration"
              onRegistered={(customer) => { registerCustomer(customer, { silent: true }); setRegistered(customer); }}
            />
            <button onClick={() => setPending(null)} className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-700">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- step 3: done
  if (registered) {
    return (
      <div className="flex min-h-screen items-center bg-gradient-to-b from-teal-50 to-slate-50 px-4">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="mt-3 text-lg font-medium text-emerald-800">You're registered, {registered.firstName.charAt(0) + registered.firstName.slice(1).toLowerCase()}!</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-emerald-700">
            We've saved your details. You can now schedule a pickup or check on your laundry.
          </p>
          <button
            onClick={() => onSignedIn(registered)}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Go to my Account <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ---- step 1: splash + auth
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        {header}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div role="tablist" aria-label="Log in or register" className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {[["login", "Log in"], ["register", "Register"]].map(([id, label]) => (
              <button
                key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`rounded-md py-2 ${tab === id ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <GoogleButton
              onClick={() => setGoogleOpen(true)}
              label={tab === "login" ? "Continue with Google" : "Sign up with Google"}
            />
          </div>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={12} /> or use your email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {tab === "login" ? (
            <LoginForm customers={customers} onSignedIn={onSignedIn} onSignIn={onSignIn} onGoRegister={() => setTab("register")} />
          ) : (
            <RegisterStart customers={customers} onContinue={setPending} />
          )}

          {IS_API && <p className="mt-3 text-center text-[11px] text-slate-400">Google sign-in becomes available once it is set up on the server.</p>}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          {tab === "login" ? "New to The Empress Laundry? " : "Already have an account? "}
          <button onClick={() => setTab(tab === "login" ? "register" : "login")} className="font-medium text-teal-700 underline">
            {tab === "login" ? "Register" : "Log in"}
          </button>
        </p>
      </div>

      {googleOpen && <GoogleAccountDialog onClose={() => setGoogleOpen(false)} onSelect={handleGoogle} />}
    </div>
  );
}
