import { useState } from "react";
import Modal from "./Modal.jsx";
import { RETURN_REASONS, CANCEL_REASONS, REJECT_RECEIPT_REASONS } from "../data/seedData.js";
import { caps } from "../utils/helpers.js";

const KINDS = {
  return: { title: "Please select the reason for the unsuccessful pickup.", reasons: RETURN_REASONS, cta: "Mark Rider Will Return" },
  cancel: { title: "Please select the reason for cancellation.", reasons: CANCEL_REASONS, cta: "Cancel order" },
  receipt: { title: "Please select the reason for rejecting this receipt.", reasons: REJECT_RECEIPT_REASONS, cta: "Reject receipt" },
};
const OTHER = "Other (Please specify)";

// Required-reason dialog: the action cannot be submitted without a reason, and "Other" needs text.
export default function ReasonModal({ kind, onConfirm, onClose }) {
  const cfg = KINDS[kind];
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");
  const valid = choice && (choice !== OTHER || other.trim());

  return (
    <Modal title={cfg.title} onClose={onClose}>
      <label htmlFor="reason-select" className="sr-only">Reason</label>
      <select id="reason-select" value={choice} onChange={(e) => setChoice(e.target.value)} className="w-full rounded-md border border-slate-200 px-2.5 py-2.5 text-sm">
        <option value="" disabled>Select a reason…</option>
        {[...cfg.reasons, OTHER].map((r) => <option key={r}>{r}</option>)}
      </select>
      {choice === OTHER && (
        <textarea
          value={other} onChange={(e) => setOther(caps(e.target.value))} rows={2} autoFocus
          placeholder="TYPE THE SPECIFIC REASON" aria-label="Specify the reason"
          className="mt-2 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm uppercase"
        />
      )}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Back</button>
        <button
          type="button" disabled={!valid}
          onClick={() => onConfirm(choice === OTHER ? other.trim() : choice)}
          className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {cfg.cta}
        </button>
      </div>
    </Modal>
  );
}
