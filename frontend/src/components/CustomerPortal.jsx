import { useState } from "react";
import { Package, CheckCircle2, ArrowRight, Search } from "lucide-react";
import RegistrationForm from "./RegistrationForm.jsx";

// Public landing page. Staff/owner entry is deliberately not linked from here (open /#staff directly).
export default function CustomerPortal({ customers, registerCustomer, onGoToAccount }) {
  const [registered, setRegistered] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Package size={18} />
          </div>
          <span className="text-sm font-medium">The Empress Laundry Pick-Up &amp; Delivery</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {!registered ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-medium sm:text-3xl">The Empress Laundry</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Full Laundry Service (max. 8kg per load) | FREE Pick-Up &amp; Delivery | Cash or GCash
              </p>
            </div>

            <button
              onClick={onGoToAccount}
              className="mt-6 flex w-full items-center justify-between gap-3 rounded-xl border-2 border-teal-600 bg-teal-100 px-4 py-4 text-left shadow-md hover:bg-teal-200 sm:px-5 sm:py-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                  <Search size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-teal-900 sm:text-base">Already a customer? Sign in</div>
                  <div className="text-xs text-teal-800 sm:text-sm">Check your laundry status or schedule a pickup</div>
                </div>
              </div>
              <ArrowRight size={20} className="shrink-0 text-teal-700" />
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or register below if you're new</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <RegistrationForm
              customers={customers}
              submitLabel="Register"
              onRegistered={(customer) => { registerCustomer(customer, { silent: true }); setRegistered(customer); }}
            />
          </>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="mt-3 text-lg font-medium text-emerald-800">You're registered, {registered.firstName.charAt(0) + registered.firstName.slice(1).toLowerCase()}!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-emerald-700">
              We've saved your details. Sign in with your contact number and 4-digit PIN to schedule a pickup or check on your laundry.
            </p>
            <button
              onClick={onGoToAccount}
              className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Go to my Account <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
