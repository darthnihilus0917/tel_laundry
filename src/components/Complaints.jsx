import { useState } from "react";
import { Plus, X } from "lucide-react";
import Badge from "./Badge.jsx";
import { RIDERS, ATTENDANT } from "../data/seedData.js";
import { personName } from "../utils/helpers.js";

function ResolveForm({ onResolve }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900">Resolve</button>;
  }
  return (
    <div className="flex w-full items-center gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Resolution note…" className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs" />
      <button onClick={() => text && onResolve(text)} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Save</button>
      <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
    </div>
  );
}

export default function Complaints({ complaints, orders, customers, addComplaint, updateComplaint }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ orderId: orders[0]?.id || "", channel: "Text", message: "" });

  function submit(e) {
    e.preventDefault();
    addComplaint({
      id: "t" + Math.random().toString(36).slice(2, 6),
      orderId: form.orderId, channel: form.channel, message: form.message,
      status: "Open", assignedTo: null, response: "", createdAt: "Just now",
    });
    setForm({ orderId: orders[0]?.id || "", channel: "Text", message: "" });
    setShowForm(false);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">Complaints & follow-ups</h1>
          <p className="mt-1 text-sm text-slate-500">Linked to the order, assigned directly — no owner tag-and-wait relay.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center justify-center gap-1 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto">
          <Plus size={14} /> Log complaint
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Order</label>
              <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm">
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.id} — {personName(customers, o.customerId)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Channel</label>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm">
                <option>Text</option><option>Viber</option><option>Messenger</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Message</label>
            <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">Create ticket</button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {complaints.map((t) => {
          const order = orders.find((o) => o.id === t.orderId);
          return (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{personName(customers, order?.customerId)} · {t.orderId}</div>
                <Badge className={
                  t.status === "Open" ? "bg-rose-50 text-rose-700 border-rose-300" :
                  t.status === "In Progress" ? "bg-amber-50 text-amber-700 border-amber-300" :
                  "bg-emerald-50 text-emerald-700 border-emerald-300"
                }>{t.status}</Badge>
              </div>
              <div className="mt-1 text-slate-600">"{t.message}"</div>
              <div className="mt-1 text-xs text-slate-400">{t.channel} · {t.createdAt}</div>

              {t.status !== "Resolved" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!t.assignedTo && (
                    <select
                      onChange={(e) => e.target.value && updateComplaint(t.id, { assignedTo: e.target.value, status: "In Progress" })}
                      defaultValue=""
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="" disabled>Assign to…</option>
                      {[...RIDERS, ATTENDANT].map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  {t.assignedTo && (
                    <>
                      <span className="text-xs text-slate-500">Assigned: {personName([...RIDERS, ATTENDANT], t.assignedTo)}</span>
                      <ResolveForm onResolve={(response) => updateComplaint(t.id, { status: "Resolved", response })} />
                    </>
                  )}
                </div>
              )}
              {t.status === "Resolved" && <div className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">Resolution: {t.response}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
