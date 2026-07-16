import { useState } from "react";
import { Search, MapPin, Phone, UserPlus, Wallet, Shirt } from "lucide-react";
import Badge from "./Badge.jsx";

export default function Customers({ customers, orders, goToRegister }) {
  const [q, setQ] = useState("");
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.contact.includes(q));

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">Customer directory</h1>
          <p className="mt-1 text-sm text-slate-500">Replaces digging through old chat history for returning customers.</p>
        </div>
        <button
          onClick={goToRegister}
          className="flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto"
        >
          <UserPlus size={15} /> Register customer
        </button>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or contact…" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm" />
      </div>

      {filtered.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          No customers match "{q}".
        </div>
      )}

      {/* Mobile: stacked cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <Badge className="bg-slate-100 text-slate-600 border-slate-200">{orders.filter((o) => o.customerId === c.id).length} orders</Badge>
            </div>
            <div className="mt-2 space-y-1 text-slate-500">
              <div className="flex items-center gap-1.5"><Phone size={12} />{c.contact}</div>
              <div className="flex items-center gap-1.5"><MapPin size={12} />{c.pickupAddr}</div>
              <div className="flex items-center gap-3 pt-1">
                <span className="flex items-center gap-1"><Wallet size={12} />{c.paymentMode}</span>
                <span className="flex items-center gap-1"><Shirt size={12} />{c.defaultPackage}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Pick-up address</th>
              <th className="px-3 py-2">Payment mode</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Orders</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 text-slate-500"><Phone size={12} className="mr-1 inline" />{c.contact}</td>
                <td className="px-3 py-2 text-slate-500"><MapPin size={12} className="mr-1 inline" />{c.pickupAddr}</td>
                <td className="px-3 py-2">{c.paymentMode}</td>
                <td className="px-3 py-2">{c.defaultPackage}</td>
                <td className="px-3 py-2 text-slate-500">{orders.filter((o) => o.customerId === c.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
