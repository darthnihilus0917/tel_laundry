import { useState } from "react";
import { Package, Search, LogIn, ArrowLeft, Clock, MapPin, Camera, CheckCircle2, CalendarPlus, Wallet } from "lucide-react";
import Badge from "./Badge.jsx";
import { PACKAGE_PRICE } from "../data/seedData.js";

const CUSTOMER_STATUS_LABEL = {
  "New Request": "Received — awaiting rider assignment",
  "Assigned for Pickup": "Rider assigned, on the way",
  "Picked Up": "Picked up from you",
  "In Shop": "Being washed",
  "Ready for Delivery": "Ready, awaiting delivery",
  "Out for Delivery": "Out for delivery",
  "Delivered": "Delivered",
  "Payment Verification": "Delivered — payment being verified",
  "Completed": "Completed",
};

const CUSTOMER_STATUS_COLOR = {
  "New Request": "bg-slate-100 text-slate-700 border-slate-300",
  "Assigned for Pickup": "bg-blue-50 text-blue-700 border-blue-300",
  "Picked Up": "bg-blue-50 text-blue-700 border-blue-300",
  "In Shop": "bg-amber-50 text-amber-700 border-amber-300",
  "Ready for Delivery": "bg-teal-50 text-teal-700 border-teal-300",
  "Out for Delivery": "bg-teal-50 text-teal-700 border-teal-300",
  "Delivered": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "Payment Verification": "bg-purple-50 text-purple-700 border-purple-300",
  "Completed": "bg-emerald-100 text-emerald-800 border-emerald-400",
};

const SCHEDULE_FORM_DEFAULTS = { pkg: "Deluxe", handover: "Personal", preferredTime: "" };

function ScheduleForm({ customer, onSchedule, onCancel }) {
  const [form, setForm] = useState({ ...SCHEDULE_FORM_DEFAULTS, pkg: customer.defaultPackage });

  function submit(e) {
    e.preventDefault();
    onSchedule(form);
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
      <div className="flex items-center gap-1.5 text-sm font-medium text-teal-800">
        <CalendarPlus size={15} /> Schedule a pickup
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-600">Package</label>
          <select value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm">
            <option value="Premium">Premium — ₱{PACKAGE_PRICE.Premium}/load</option>
            <option value="Deluxe">Deluxe — ₱{PACKAGE_PRICE.Deluxe}/load</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Handover method</label>
          <select value={form.handover} onChange={(e) => setForm({ ...form, handover: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm">
            <option>Personal</option>
            <option>Lobby</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Preferred pickup time (optional)</label>
        <input
          value={form.preferredTime}
          onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
          placeholder="e.g. Tomorrow afternoon, after 2pm"
          className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
        />
      </div>
      <p className="text-xs text-slate-500">Pick-up address on file: {customer.pickupAddr}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="flex-1 rounded-md bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
          Confirm pickup request
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

function OrderCard({ order }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{order.id}</div>
          <div className="text-xs text-slate-400">{order.createdAt}</div>
        </div>
        <Badge className={CUSTOMER_STATUS_COLOR[order.status]}>{CUSTOMER_STATUS_LABEL[order.status]}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{order.package}</Badge>
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{order.handover} handover</Badge>
        {order.delay && <Badge className="bg-amber-50 text-amber-700 border-amber-300">Running behind — next-day</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Wallet size={12} />
          {order.paymentStatus === "Verified" ? "Paid" : order.paymentStatus === "Pending Verification" ? "Payment being verified" : "Payment due on handover"}
        </span>
        {order.handover === "Lobby" && (
          <span className="flex items-center gap-1">
            <Camera size={12} /> {order.proofPhoto ? "Proof photo on file" : "Proof photo pending"}
          </span>
        )}
      </div>
      {order.delay?.reason && <div className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">{order.delay.reason}</div>}
    </div>
  );
}

export default function CustomerAccount({ customers, orders, addOrder, onStaffLogin, onGoToRegister }) {
  const [contactInput, setContactInput] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [justScheduled, setJustScheduled] = useState(null);

  function lookup(e) {
    e.preventDefault();
    const found = customers.find((c) => c.contact.replace(/\s/g, "") === contactInput.replace(/\s/g, ""));
    if (found) {
      setMatchedCustomer(found);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  }

  function schedule(formValues) {
    const order = {
      id: "o" + Math.floor(1000 + Math.random() * 9000),
      customerId: matchedCustomer.id, status: "New Request", package: formValues.pkg, weight: null, price: null,
      handover: formValues.handover, channel: "App", riderId: null,
      proofPhoto: false, paymentStatus: "Unpaid", paymentMethod: matchedCustomer.paymentMode,
      gcashRef: "", delay: null, createdAt: "Just now", notes: formValues.preferredTime ? `Preferred time: ${formValues.preferredTime}` : "",
    };
    addOrder(order, null);
    setShowSchedule(false);
    setJustScheduled(order.id);
    setTimeout(() => setJustScheduled(null), 4000);
  }

  const myOrders = matchedCustomer ? orders.filter((o) => o.customerId === matchedCustomer.id) : [];

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
        {!matchedCustomer ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-medium sm:text-3xl">My account</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Enter the contact number you registered with to schedule a pickup or check on your laundry.
              </p>
            </div>

            <form onSubmit={lookup} className="mx-auto mt-6 max-w-sm rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <label className="text-xs font-medium text-slate-600">Contact number</label>
              <div className="relative mt-1">
                <Search size={15} className="absolute left-2.5 top-3 text-slate-400" />
                <input
                  value={contactInput}
                  onChange={(e) => { setContactInput(e.target.value); setNotFound(false); }}
                  placeholder="0917 000 0000"
                  className={`w-full rounded-md border py-2.5 pl-8 pr-3 text-sm ${notFound ? "border-rose-300" : "border-slate-200"}`}
                />
              </div>
              {notFound && (
                <p className="mt-2 text-xs text-rose-600">
                  We couldn't find that number. <button type="button" onClick={onGoToRegister} className="underline">Register as a new customer</button> instead?
                </p>
              )}
              <button type="submit" className="mt-3 w-full rounded-md bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                Find my account
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-medium">Welcome back, {matchedCustomer.name.split(" ")[0]}</h1>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><MapPin size={12} />{matchedCustomer.pickupAddr}</p>
              </div>
              <button
                onClick={() => { setMatchedCustomer(null); setContactInput(""); setShowSchedule(false); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft size={13} /> Switch account
              </button>
            </div>

            {justScheduled && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 size={16} /> Pickup requested ({justScheduled}) — the shop will confirm shortly.
              </div>
            )}

            {!showSchedule ? (
              <button
                onClick={() => setShowSchedule(true)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-3 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto"
              >
                <CalendarPlus size={15} /> Schedule a pickup
              </button>
            ) : (
              <ScheduleForm customer={matchedCustomer} onSchedule={schedule} onCancel={() => setShowSchedule(false)} />
            )}

            <div className="mt-6">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Clock size={15} /> Your orders
              </div>
              <div className="mt-2 space-y-2">
                {myOrders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                    No orders yet — schedule your first pickup above.
                  </div>
                )}
                {myOrders.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
