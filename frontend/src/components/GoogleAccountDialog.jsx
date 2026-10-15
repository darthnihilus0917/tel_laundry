import { useState } from "react";
import Modal from "./Modal.jsx";
import { User } from "lucide-react";

// DEMO ONLY. Stands in for Google's account chooser so the sign-in flow can be shown without a Google
// project. Replace with Google Identity Services (VITE_GOOGLE_CLIENT_ID) and verify the ID token on the
// server before treating the email as authenticated.
const DEMO_ACCOUNTS = [
  { firstName: "MARIA", lastName: "SANTOS", email: "maria.santos@gmail.com" },
  { firstName: "JUAN", lastName: "DELA CRUZ", email: "juan.delacruz@gmail.com" },
];

export default function GoogleAccountDialog({ onSelect, onClose }) {
  const [other, setOther] = useState(false);
  const [email, setEmail] = useState("");
  const valid = /^[^\s@]+@gmail\.com$/i.test(email.trim());

  return (
    <Modal title="Choose a Google account" onClose={onClose}>
      <p className="text-xs text-slate-500">to continue to The Empress Laundry</p>
      <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button
              onClick={() => onSelect(a)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
                {a.firstName[0]}
              </span>
              <span className="text-sm">
                <span className="block font-medium text-slate-800">
                  {a.firstName.charAt(0) + a.firstName.slice(1).toLowerCase()} {a.lastName.charAt(0) + a.lastName.slice(1).toLowerCase()}
                </span>
                <span className="block text-xs text-slate-500">{a.email}</span>
              </span>
            </button>
          </li>
        ))}
        <li>
          {other ? (
            <form
              className="flex items-center gap-2 p-2.5"
              onSubmit={(e) => { e.preventDefault(); if (valid) onSelect({ firstName: "", lastName: "", email: email.trim() }); }}
            >
              <input
                autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com" aria-label="Gmail address"
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 py-2 text-sm"
              />
              <button disabled={!valid} className="rounded-md bg-teal-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Next</button>
            </form>
          ) : (
            <button onClick={() => setOther(true)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><User size={15} /></span>
              <span className="text-sm text-slate-700">Use another account</span>
            </button>
          )}
        </li>
      </ul>
      <p className="mt-3 text-[11px] text-slate-400">Demo screen — no real Google account is contacted.</p>
      <button onClick={onClose} className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-700">Cancel</button>
    </Modal>
  );
}
