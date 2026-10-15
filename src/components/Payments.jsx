import Badge from "./Badge.jsx";
import { PACKAGE_PRICE } from "../data/seedData.js";
import { personName, ageLabel, ageHours } from "../utils/helpers.js";

export default function Payments({ orders, customers, markVerified }) {
  const relevant = orders.filter((o) => o.paymentStatus !== "Unpaid");

  return (
    <div>
      <h1 className="text-lg font-medium">Payments & cash log</h1>
      <p className="mt-1 text-sm text-slate-500">Remote-auditable log — replaces physically checking the paper logbook.</p>

      {relevant.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">No payments logged yet.</div>
      )}

      {/* Mobile: cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {relevant.map((o) => (
          <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{personName(customers, o.customerId)}</span>
              <Badge className={o.paymentStatus === "Verified" ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-purple-50 text-purple-700 border-purple-300"}>
                {o.paymentStatus}
              </Badge>
            </div>
            <div className="mt-1 text-slate-500">{o.id} · {o.paymentMethod}{o.gcashRef ? ` · •••${o.gcashRef}` : ""}{o.paymentStatus === "Pending Verification" && o.paymentTs ? ` · logged ${ageLabel(o.paymentTs)}${ageHours(o.paymentTs) > 24 ? " ⚠ overdue" : ""}` : ""}</div>
            <div className="mt-1 font-medium">₱{o.price ?? PACKAGE_PRICE[o.package]}</div>
            {o.paymentStatus === "Pending Verification" && (
              <button onClick={() => markVerified(o.id)} className="mt-2 w-full rounded-md bg-slate-800 px-2 py-2 text-xs font-medium text-white hover:bg-slate-900">
                Mark verified
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Ref #</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {relevant.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500">{o.id}</td>
                <td className="px-3 py-2 font-medium">{personName(customers, o.customerId)}</td>
                <td className="px-3 py-2">{o.paymentMethod}</td>
                <td className="px-3 py-2 text-slate-500">{o.gcashRef ? `•••${o.gcashRef}` : "—"}</td>
                <td className="px-3 py-2">₱{o.price ?? PACKAGE_PRICE[o.package]}</td>
                <td className="px-3 py-2">
                  <Badge className={o.paymentStatus === "Verified" ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-purple-50 text-purple-700 border-purple-300"}>
                    {o.paymentStatus}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {o.paymentStatus === "Pending Verification" && (
                    <button onClick={() => markVerified(o.id)} className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900">
                      Mark verified
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
