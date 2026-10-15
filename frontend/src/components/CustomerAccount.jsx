import { useState } from "react";
import {
  Package, Search, ArrowLeft, Clock, MapPin, CheckCircle2, CalendarPlus, Wallet, MessageSquareWarning,
  Send, XCircle, Bike, CalendarClock, UserCog, LogOut, MessageCircle, RotateCcw, Phone,
} from "lucide-react";
import Badge from "./Badge.jsx";
import PayGcashModal from "./PayGcashModal.jsx";
import PickupRequestForm from "./PickupRequestForm.jsx";
import { AddressBlock } from "./RegistrationForm.jsx";
import { MultiPhotoAttach } from "./PhotoAttach.jsx";
import {
  RIDERS, CUSTOMER_STAGE, CANCELLABLE_STATUSES, FOLLOWUP_STATUSES, DELIVERED_STATUSES,
  PACKAGE_NAME, PACKAGE_PRICE, DEFAULT_BRANCH,
} from "../data/seedData.js";
import { personName, newId, caps, paymentSummary, pickupAddressOf, deliveryAddressOf, orderDateLabel, orderTimeLabel } from "../utils/helpers.js";
import { ADDRESS_FIELDS, addressBlank, addressComplete } from "../utils/address.js";
import { formatPickupDate } from "../utils/time.js";

const COMPLAINT_STATUS_LABEL = { "Open": "Received — not yet reviewed", "In Progress": "Being looked into", "Resolved": "Resolved" };
const COMPLAINT_STATUS_COLOR = {
  "Open": "bg-rose-50 text-rose-700 border-rose-300",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-300",
  "Resolved": "bg-emerald-50 text-emerald-700 border-emerald-300",
};

const outlineBtn = "flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";

function IssueForm({ order, onSubmit, onCancel }) {
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState([]);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (message.trim()) onSubmit({ message: message.trim(), photos, kind: "Issue" }); }}
      className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <input readOnly value={`Issue with Order ID #${order.id}`} aria-label="Subject" className="w-full rounded-md border border-slate-200 bg-slate-100 px-2.5 py-2 text-sm font-medium text-slate-700" />
      <textarea
        required value={message} onChange={(e) => setMessage(caps(e.target.value))} rows={3}
        placeholder="Please describe the issue in detail..."
        className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm uppercase"
      />
      <MultiPhotoAttach photos={photos} onChange={setPhotos} max={10} />
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900">
          <Send size={12} /> Send to the shop
        </button>
        <button type="button" onClick={onCancel} className={outlineBtn}>Cancel</button>
      </div>
    </form>
  );
}

function FollowUpForm({ onSubmit, onCancel }) {
  const [message, setMessage] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (message.trim()) onSubmit({ message: message.trim(), photos: [], kind: "Follow-up" }); }}
      className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <label className="text-xs font-medium text-slate-700">Message the shop about this order</label>
      <textarea
        required value={message} onChange={(e) => setMessage(caps(e.target.value))} rows={2}
        placeholder="E.G. CAN YOU CONFIRM THE PICK-UP TIME?"
        className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm uppercase"
      />
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900">
          <Send size={12} /> Send
        </button>
        <button type="button" onClick={onCancel} className={outlineBtn}>Cancel</button>
      </div>
    </form>
  );
}

function DetailRow({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-slate-600">
      <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" />
      <span>{children}</span>
    </div>
  );
}

function OrderCard({ order, customer, orderComplaints, onFile, onCancelOrder, onReschedule, onPay }) {
  const [panel, setPanel] = useState(null); // "issue" | "followup" | null
  const [justFiled, setJustFiled] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [paying, setPaying] = useState(false);

  const stage = CUSTOMER_STAGE[order.status];
  const delivered = DELIVERED_STATUSES.includes(order.status);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const canFollowUp = FOLLOWUP_STATUSES.includes(order.status);
  const canPay = order.handover === "Leave at Lobby" && order.price != null && ["Unpaid", "Awaiting Re-upload"].includes(order.paymentStatus) && order.status !== "Cancelled";
  const note = order.status === "Rider Will Return" ? order.returnReason : order.status === "Cancelled" ? order.cancelReason : null;

  function handleFile(data) {
    onFile(order.id, data);
    setPanel(null);
    setJustFiled(true);
    setTimeout(() => setJustFiled(false), 4000);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm" data-testid={`order-${order.id}`}>
      <div className="flex items-start justify-between gap-2">
        <Badge className={stage.color}>{stage.label}</Badge>
        <div className="text-right">
          <div className="font-medium">{order.id}</div>
          <div className="text-xs text-slate-400">{orderDateLabel(order)} · {orderTimeLabel(order)}</div>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {(order.packages || []).map((p) => (
          <div key={p.id} className="text-xs">
            <span className="font-semibold uppercase text-slate-700">{PACKAGE_NAME[p.id]} • ₱{PACKAGE_PRICE[p.id]} / load</span>
            {p.instruction && <div className="text-slate-500">Instruction: {p.instruction}</div>}
          </div>
        ))}
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{order.handover}</Badge>
        {order.delay && <Badge className="ml-1 bg-amber-50 text-amber-700 border-amber-300">Running behind — next-day</Badge>}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        <DetailRow icon={MapPin}>Pick-up: {pickupAddressOf(customer)}</DetailRow>
        {customer.deliveryAddress && <DetailRow icon={MapPin}>Delivery: {deliveryAddressOf(customer)}</DetailRow>}
        {order.pickupDate && <DetailRow icon={CalendarClock}>{formatPickupDate(order.pickupDate)} · {order.pickupSlot}</DetailRow>}
        <DetailRow icon={Wallet}>{paymentSummary(order)}</DetailRow>
        {order.riderId && <DetailRow icon={Bike}>Rider: {personName(RIDERS, order.riderId)}</DetailRow>}
      </div>

      {(order.bagPhoto || order.proofPhotoUrl) && (
        <div className="mt-2 flex gap-2">
          {order.bagPhoto && <img src={order.bagPhoto} alt="Bag/basket photo" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />}
          {order.proofPhotoUrl && <img src={order.proofPhotoUrl} alt="Proof of delivery" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />}
        </div>
      )}

      {note && (
        <div className="mt-2 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700">Note: {note}</div>
      )}

      {order.delay?.reason && (
        <div className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          {order.delay.reason}
          {order.delay.eta && <span className="font-medium"> · New ETA: {order.delay.eta}</span>}
        </div>
      )}

      {orderComplaints.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {orderComplaints.map((t) => (
            <div key={t.id} className="rounded-md bg-slate-50 p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-600">Your {t.kind === "Follow-up" ? "follow-up" : "report"}: "{t.message}"</span>
                <Badge className={COMPLAINT_STATUS_COLOR[t.status]}>{COMPLAINT_STATUS_LABEL[t.status]}</Badge>
              </div>
              {t.status === "In Progress" && t.response && <div className="mt-1.5 rounded bg-amber-50 px-2 py-1.5 text-amber-700">Update from the shop: {t.response}</div>}
              {t.status === "Resolved" && t.response && <div className="mt-1.5 rounded bg-emerald-50 px-2 py-1.5 text-emerald-700">Shop's response: {t.response}</div>}
            </div>
          ))}
        </div>
      )}

      {justFiled && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700">
          <CheckCircle2 size={13} /> Sent to the shop — we'll follow up on this order.
        </div>
      )}

      {canPay && (
        <button onClick={() => setPaying(true)} className="mt-3 w-full rounded-md bg-teal-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-teal-700">
          {order.paymentStatus === "Awaiting Re-upload" ? "Re-upload receipt via GCash" : "Pay via GCash"}
        </button>
      )}
      {order.paymentStatus === "Awaiting Re-upload" && order.rejectReason && (
        <div className="mt-2 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">Receipt rejected: {order.rejectReason}</div>
      )}

      {/* Action buttons — strictly status-driven */}
      <div className="mt-3 flex flex-wrap gap-2">
        {canFollowUp && panel !== "followup" && (
          <button onClick={() => setPanel("followup")} className={outlineBtn}><MessageCircle size={13} /> Follow up on order</button>
        )}
        {canCancel && !confirmingCancel && (
          <button onClick={() => setConfirmingCancel(true)} className={outlineBtn}><XCircle size={13} /> Cancel this pickup</button>
        )}
        {delivered && panel !== "issue" && (
          <button onClick={() => setPanel("issue")} className={outlineBtn}><MessageSquareWarning size={13} /> Report an issue with this order</button>
        )}
        {order.status === "Cancelled" && (
          <button onClick={() => onReschedule(order)} className={outlineBtn}><RotateCcw size={13} /> Reschedule this pickup</button>
        )}
      </div>

      {confirmingCancel && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
          <span>Cancel this pickup request?</span>
          <button onClick={() => { onCancelOrder(order.id); setConfirmingCancel(false); }} className="rounded-md bg-slate-800 px-2.5 py-1.5 font-medium text-white">Yes, cancel it</button>
          <button onClick={() => setConfirmingCancel(false)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600">No, keep it</button>
        </div>
      )}

      {panel === "followup" && <FollowUpForm onSubmit={handleFile} onCancel={() => setPanel(null)} />}
      {panel === "issue" && <IssueForm order={order} onSubmit={handleFile} onCancel={() => setPanel(null)} />}

      {paying && (
        <PayGcashModal
          order={order}
          onClose={() => setPaying(false)}
          onSubmit={(receipt) => { onPay(order.id, receipt); setPaying(false); }}
        />
      )}
    </div>
  );
}

function ProfileView({ customer, onSave, onBack }) {
  const [form, setForm] = useState({
    firstName: customer.firstName, lastName: customer.lastName, contact: customer.contact,
    address: customer.address, deliveryAddress: customer.deliveryAddress || { unit: "", subdivision: "", barangay: "", city: "", landmark: "" },
    pin: "",
  });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  function submit(e) {
    e.preventDefault();
    const v = {};
    if (!form.firstName.trim() || !form.lastName.trim()) v.name = "First and last name are required";
    if (!form.contact.trim()) v.contact = "Contact number is required";
    const miss = {};
    ADDRESS_FIELDS.filter((f) => f.required).forEach((f) => { if (!form.address[f.key].trim()) miss[f.key] = "Required"; });
    if (Object.keys(miss).length) v.address = miss;
    if (!addressBlank(form.deliveryAddress) && !addressComplete(form.deliveryAddress)) v.delivery = "Complete all required delivery address boxes, or leave them all blank.";
    if (form.pin && !/^\d{4}$/.test(form.pin)) v.pin = "PIN must be exactly 4 digits";
    setErrors(v);
    if (Object.keys(v).length) return;
    onSave({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      contact: form.contact.trim(), address: form.address,
      deliveryAddress: addressBlank(form.deliveryAddress) ? null : form.deliveryAddress,
      area: form.address.subdivision,
      ...(form.pin ? { pin: form.pin } : {}),
    });
    setForm((f) => ({ ...f, pin: "" }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const field = "mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm uppercase";
  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">My Profile</h1>
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"><ArrowLeft size={13} /> Back</button>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">1. Personal Details</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pf-first" className="text-xs font-medium text-slate-600">First name</label>
            <input id="pf-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: caps(e.target.value) })} className={field} />
          </div>
          <div>
            <label htmlFor="pf-last" className="text-xs font-medium text-slate-600">Last name</label>
            <input id="pf-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: caps(e.target.value) })} className={field} />
          </div>
        </div>
        {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
        <div>
          <label htmlFor="pf-contact" className="text-xs font-medium text-slate-600">Contact number</label>
          <input id="pf-contact" inputMode="tel" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={field.replace("uppercase", "")} />
          {errors.contact && <p className="mt-1 text-xs text-rose-600">{errors.contact}</p>}
        </div>
      </fieldset>

      <AddressBlock title="2. Pick-up Address" value={form.address} onChange={(address) => setForm({ ...form, address })} errors={errors.address} idPrefix="pf-pickup" allRequired />

      <div>
        <AddressBlock title="Delivery Address" hint="Leave blank if same as pick-up address." value={form.deliveryAddress} onChange={(deliveryAddress) => setForm({ ...form, deliveryAddress })} idPrefix="pf-delivery" />
        {errors.delivery && <p className="mt-1 text-xs text-rose-600">{errors.delivery}</p>}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">3. Security</legend>
        <label htmlFor="pf-pin" className="mt-2 block text-xs font-medium text-slate-600">Update 4-Digit PIN</label>
        <input
          id="pf-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" placeholder="Leave blank to keep your current PIN"
          value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
          className={field.replace("uppercase", "")}
        />
        {errors.pin && <p className="mt-1 text-xs text-rose-600">{errors.pin}</p>}
      </fieldset>

      {saved && <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700"><CheckCircle2 size={13} /> Your profile was updated.</div>}
      <button type="submit" className="w-full rounded-md bg-teal-600 px-3 py-3 text-sm font-bold text-white hover:bg-teal-700">[ Save Changes ]</button>
    </form>
  );
}

export default function CustomerAccount({ customers, orders, addOrder, cancelOrder, complaints, addComplaint, updateCustomer, payOrder, signedInCustomerId, onBack }) {
  // The splash screen handles log in / register; this screen is only reached with a signed-in customer.
  const [customerId, setCustomerId] = useState(signedInCustomerId ?? null);
  const [view, setView] = useState("orders"); // orders | schedule | profile
  const [rebook, setRebook] = useState(null);

  const customer = customers.find((c) => c.id === customerId) || null;

  function logOut() {
    setCustomerId(null); setView("orders");
    onBack?.();
  }

  function schedule(fields) {
    addOrder({
      customerId: customer.id, branchId: customer.branchId || DEFAULT_BRANCH, status: "New Request",
      weight: null, price: null, channel: "App", riderId: null, proofPhoto: false,
      paymentStatus: "Unpaid", gcashRef: "", delay: null, notes: "", ...fields,
    });
  }

  function fileComplaint(orderId, data) {
    addComplaint({ id: newId("t"), orderId, branchId: customer.branchId || DEFAULT_BRANCH, channel: "App", status: "Open", assignedTo: null, response: "", createdAt: "Just now", ...data });
  }

  const myOrders = customer ? orders.filter((o) => o.customerId === customer.id).sort((a, b) => b.createdTs - a.createdTs) : [];
  const myOrderIds = new Set(myOrders.map((o) => o.id));
  const myComplaints = complaints.filter((t) => myOrderIds.has(t.orderId));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white"><Package size={18} /></div>
            <span className="text-sm font-medium">The Empress Laundry</span>
          </div>
          {customer && (
            <div className="flex gap-2">
              <button onClick={() => setView("profile")} className={outlineBtn}><UserCog size={13} /> My Profile</button>
              <button onClick={logOut} className={outlineBtn}><LogOut size={13} /> Log Out</button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {!customer ? (
          <div className="text-center text-sm text-slate-500">
            Your session has ended.{" "}
            <button onClick={onBack} className="font-medium text-teal-700 underline">Log in again</button>
          </div>
        ) : view === "profile" ? (
          <ProfileView customer={customer} onSave={(patch) => updateCustomer(customer.id, patch)} onBack={() => setView("orders")} />
        ) : (
          <>
            <div>
              <h1 className="text-xl font-medium">Ready for laundry day, {customer.firstName.charAt(0) + customer.firstName.slice(1).toLowerCase()}?</h1>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Phone size={12} />{customer.contact}{customer.email && ` · ${customer.email}`}</p>
              <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500"><MapPin size={12} className="mt-0.5 shrink-0" />{pickupAddressOf(customer)}</p>
            </div>

            {view === "schedule" ? (
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-teal-800"><CalendarPlus size={15} /> Schedule a pickup</div>
                <div className="mt-2">
                  <PickupRequestForm
                    customer={customer}
                    initial={rebook}
                    onSubmit={schedule}
                    onCancel={() => setView("orders")}
                    onDone={() => setView("orders")}
                  />
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setRebook(null); setView("schedule"); }}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-3 text-sm font-bold text-white hover:bg-teal-700 sm:w-auto"
                >
                  <CalendarPlus size={15} /> Schedule a pickup
                </button>

                <div className="mt-6">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700"><Clock size={15} /> Your Orders</div>
                  <div className="mt-2 space-y-2">
                    {myOrders.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No orders yet — schedule your first pickup above.</div>
                    )}
                    {myOrders.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        customer={customer}
                        orderComplaints={myComplaints.filter((t) => t.orderId === o.id)}
                        onFile={fileComplaint}
                        onCancelOrder={cancelOrder}
                        onReschedule={(o) => { setRebook(o); setView("schedule"); }}
                        onPay={payOrder}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
