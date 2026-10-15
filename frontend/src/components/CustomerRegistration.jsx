import { useState } from "react";
import { UserPlus, CheckCircle2, PackagePlus } from "lucide-react";
import RegistrationForm from "./RegistrationForm.jsx";

// Staff "Register a customer" — same form component as the customer's own registration page.
export default function CustomerRegistration({ customers, registerCustomer, goToNewOrderFor }) {
  const [registered, setRegistered] = useState(null);

  if (registered) {
    return (
      <div className="max-w-lg">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="mt-3 text-base font-medium text-emerald-800">{registered.name} is registered</h2>
          <p className="mt-1 text-sm text-emerald-700">Saved to the customer directory — future orders will auto-fill their details.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => goToNewOrderFor(registered.id)}
              className="flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <PackagePlus size={15} /> Create their first order
            </button>
            <button
              onClick={() => setRegistered(null)}
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
        <h1 className="text-lg font-medium">Register a Customer</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Same form the customer sees — save their details once so nobody has to ask again.</p>
      <div className="mt-4">
        <RegistrationForm
          customers={customers}
          submitLabel="Register Customer"
          onRegistered={(customer) => { registerCustomer(customer); setRegistered(customer); }}
        />
      </div>
    </div>
  );
}
