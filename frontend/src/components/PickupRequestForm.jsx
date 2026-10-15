import { useEffect, useState } from "react";
import { MapPin, Info } from "lucide-react";
import Modal from "./Modal.jsx";
import PhotoAttach from "./PhotoAttach.jsx";
import { PACKAGES, SERVICES, HANDOVER, INSTRUCTION_LIMIT, REQUEST_CHANNELS } from "../data/seedData.js";
import { caps, paymentInstruction, pickupAddressOf } from "../utils/helpers.js";
import { nowMs, pickupDateOptions, defaultPickupDate, slotOptions } from "../utils/time.js";

const CALC_NOTICE = "Your final bill will be calculated at the shop. We will update you here.";

// The ONE order form. The customer's "Schedule a pickup" and staff "New Order" both render this,
// so look, rules and required fields are identical and both fire the same onSubmit event.
export default function PickupRequestForm({ customer, onSubmit, onCancel, onDone, initial = null, withChannel = false, submitLabel = "Confirm Pick-up Request", successText = "Request received! Track your order in your Dashboard." }) {
  const [service, setService] = useState("laundry");
  const [selected, setSelected] = useState(() => Object.fromEntries((initial?.packages || []).map((p) => [p.id, p.instruction || ""]))); // { Premium: "instruction" } — present key = checked
  const [handover, setHandover] = useState(initial?.handover || HANDOVER.RIDER);
  const [paymentMethod, setPaymentMethod] = useState(initial?.handover === HANDOVER.LOBBY ? "GCash" : "Cash");
  const [bagPhoto, setBagPhoto] = useState(null);
  const [channel, setChannel] = useState(REQUEST_CHANNELS[0]);
  const [clock, setClock] = useState(nowMs());
  const [date, setDate] = useState(defaultPickupDate());
  const [slot, setSlot] = useState("");
  const [errors, setErrors] = useState({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [success, setSuccess] = useState(false);

  // Re-evaluate the cut-offs as time passes (Manila time, not the device clock).
  useEffect(() => {
    const t = setInterval(() => setClock(nowMs()), 15000);
    return () => clearInterval(t);
  }, []);

  const dateOptions = pickupDateOptions(clock);
  const effectiveDate = dateOptions.find((d) => d.value === date && !d.disabled) ? date : defaultPickupDate(clock);
  const slots = slotOptions(effectiveDate, clock);
  const effectiveSlot = slots.find((s) => s.id === slot && !s.disabled) ? slot : (slots.find((s) => !s.disabled) || {}).id || "";

  function pickHandover(v) {
    setHandover(v);
    if (v === HANDOVER.LOBBY) setPaymentMethod("GCash");
  }

  function toggle(id) {
    setSelected((s) => {
      const next = { ...s };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
    setErrors((e) => ({ ...e, packages: undefined }));
  }

  function submit(ev) {
    ev.preventDefault();
    const e = {};
    const ids = PACKAGES.filter((p) => p.id in selected).map((p) => p.id);
    if (ids.length === 0) e.packages = "Please choose at least one package";
    if (handover === HANDOVER.LOBBY && !bagPhoto) e.bagPhoto = "Please attach a photo of your bag/basket";
    // Re-check cut-offs at the moment of submit against the current Manila time.
    const nowTs = nowMs();
    const dOk = pickupDateOptions(nowTs).find((d) => d.value === effectiveDate && !d.disabled);
    const sOk = slotOptions(effectiveDate, nowTs).find((s) => s.id === effectiveSlot && !s.disabled);
    if (!dOk || !sOk) e.when = "That pick-up time is no longer available — please choose another.";
    setErrors(e);
    if (Object.keys(e).length) return;

    onSubmit({
      packages: ids.map((id) => ({ id, instruction: (selected[id] || "").trim() })),
      handover,
      paymentMethod: handover === HANDOVER.LOBBY ? "GCash" : paymentMethod,
      bagPhoto: handover === HANDOVER.LOBBY ? bagPhoto : null,
      pickupDate: effectiveDate,
      pickupSlot: slots.find((s) => s.id === effectiveSlot).label,
      ...(withChannel ? { channel } : {}),
    });
    setSuccess(true);
  }

  const lobby = handover === HANDOVER.LOBBY;

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      {/* Service tabs — only Laundry is live; the rest are laid out for later */}
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {SERVICES.map((s) => (
          <button
            key={s.id} type="button" role="tab" aria-selected={service === s.id} disabled={!s.live}
            onClick={() => setService(s.id)}
            className={`shrink-0 flex-1 rounded-md px-3 py-2 text-xs font-medium ${service === s.id ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"} ${s.live ? "" : "cursor-not-allowed opacity-50"}`}
            title={s.live ? "" : "Coming soon"}
          >
            {s.label}{!s.live && <span className="ml-1 text-[10px]">(soon)</span>}
          </button>
        ))}
      </div>

      {/* Package menu */}
      <div>
        <div className="text-sm font-medium text-slate-700">Choose your package(s)</div>
        <p className="text-xs text-slate-400">You can pick more than one. The price shown is per load (up to 8kg) — not the amount to pay.</p>
        <div className="mt-2 space-y-2">
          {PACKAGES.map((p) => {
            const checked = p.id in selected;
            return (
              <div key={p.id} className={`rounded-lg border p-3 ${checked ? "border-teal-400 bg-teal-50/40" : "border-slate-200"}`}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="mt-1" aria-label={p.name} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold uppercase text-slate-800">{p.name} • ₱{p.price} / load <span className="font-normal text-slate-500">(up to 8kg)</span></span>
                    <span className="block text-xs text-slate-500">({p.tagline})</span>
                    <span className="mt-1 block text-xs text-slate-600">• {p.inclusions}</span>
                  </span>
                </label>
                {checked && (
                  <div className="mt-2 pl-6">
                    <label className="text-xs font-medium text-slate-600">Special Instruction (if applicable)</label>
                    <textarea
                      value={selected[p.id]}
                      maxLength={INSTRUCTION_LIMIT}
                      rows={2}
                      aria-label={`Special instruction for ${p.name}`}
                      onChange={(e) => setSelected({ ...selected, [p.id]: caps(e.target.value) })}
                      className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm uppercase"
                    />
                    <div className="text-right text-[11px] text-slate-400">{selected[p.id].length}/{INSTRUCTION_LIMIT}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {errors.packages && <p className="mt-1 text-xs text-rose-600">{errors.packages}</p>}
      </div>

      {/* Handover + payment */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pr-handover" className="text-xs font-medium text-slate-600">Handover Method</label>
          <select id="pr-handover" value={handover} onChange={(e) => pickHandover(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2.5 text-sm">
            <option>{HANDOVER.RIDER}</option>
            <option>{HANDOVER.LOBBY}</option>
          </select>
        </div>
        <div>
          <label htmlFor="pr-payment" className="text-xs font-medium text-slate-600">Payment Method</label>
          <select
            id="pr-payment" value={lobby ? "GCash" : paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2.5 text-sm"
          >
            <option value="Cash" disabled={lobby}>Cash</option>
            <option value="GCash">GCash</option>
          </select>
        </div>
      </div>

      {lobby && (
        <div>
          <PhotoAttach label="photo of bag/basket" buttonText="Upload Photo of Bag/Basket" url={bagPhoto} onChange={setBagPhoto} required />
          <p className="mt-1 text-xs text-slate-500">(Attach a photo of your bag/basket for the rider).</p>
          {errors.bagPhoto && <p className="mt-1 text-xs text-rose-600">{errors.bagPhoto}</p>}
        </div>
      )}

      {/* Payment banner: line 1 follows the handover method, line 2 is fixed */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm" data-testid="payment-banner">
        <Info size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <div className="font-semibold text-amber-900">{paymentInstruction(handover)}</div>
          <div className="text-amber-800">{CALC_NOTICE}</div>
        </div>
      </div>

      {/* Pick-up date and time */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pr-date" className="text-xs font-medium text-slate-600">Pickup Date</label>
          <select id="pr-date" value={effectiveDate} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2.5 text-sm">
            {dateOptions.map((d) => <option key={d.value} value={d.value} disabled={d.disabled}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pr-slot" className="text-xs font-medium text-slate-600">Pickup Time</label>
          <select id="pr-slot" value={effectiveSlot} onChange={(e) => setSlot(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2.5 text-sm">
            {slots.map((s) => <option key={s.id} value={s.id} disabled={s.disabled}>{s.label}</option>)}
          </select>
        </div>
      </div>
      {errors.when && <p className="-mt-3 text-xs text-rose-600">{errors.when}</p>}

      {withChannel && (
        <div>
          <label htmlFor="pr-channel" className="text-xs font-medium text-slate-600">Request channel</label>
          <select id="pr-channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2.5 text-sm">
            {REQUEST_CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" /> Pickup address on file: {pickupAddressOf(customer)}
      </p>

      <div className="flex flex-col gap-2">
        <button type="submit" className="w-full rounded-md bg-teal-600 px-3 py-3 text-sm font-bold text-white hover:bg-teal-700">
          {submitLabel}
        </button>
        <button type="button" onClick={() => setConfirmCancel(true)} className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-xs font-normal text-slate-500 hover:bg-slate-50">
          Cancel
        </button>
      </div>

      {confirmCancel && (
        <Modal title="Cancel pickup?" onClose={() => setConfirmCancel(false)}>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmCancel(false)} className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">No</button>
            <button type="button" onClick={() => { setConfirmCancel(false); onCancel(); }} className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white">Yes</button>
          </div>
        </Modal>
      )}

      {success && (
        <Modal title="Done" label="Request received" onClose={onDone}>
          <p className="text-sm text-slate-700">{successText}</p>
          <button type="button" onClick={onDone} className="mt-4 w-full rounded-md bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700">OK</button>
        </Modal>
      )}
    </form>
  );
}
