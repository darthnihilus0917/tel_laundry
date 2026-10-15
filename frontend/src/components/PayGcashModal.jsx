import { useState } from "react";
import { Copy, Download, Check } from "lucide-react";
import Modal from "./Modal.jsx";
import PhotoAttach from "./PhotoAttach.jsx";
import { GCASH } from "../data/seedData.js";

// All-in-one payment sheet for Leave-at-Lobby orders: QR, account details, receipt upload, submit.
export default function PayGcashModal({ order, onSubmit, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(GCASH.number.replace(/\s/g, ""));
    } catch { /* clipboard unavailable — number is still visible */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal title={`Please settle the final amount of ₱${order.price}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-2">
        <img src={GCASH.qr} alt="GCash QR code" className="h-44 w-44 rounded-lg border border-slate-200" />
        <a
          href={GCASH.qr} download="empress-laundry-gcash-qr.svg"
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download size={13} /> Download QR
        </a>
        <div className="text-sm font-medium text-slate-800">{GCASH.name}</div>
        <button type="button" onClick={copyNumber} className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
          {GCASH.number} {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          <span className="text-xs text-slate-500">{copied ? "Copied" : "Tap to copy"}</span>
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        (Please save the QR code or copy the number, switch to your preferred payment app to pay, then return here to attach your payment receipt).
      </p>

      <PhotoAttach label="payment receipt" buttonText="Attach Payment Receipt" url={receipt} onChange={setReceipt} required />

      <button
        type="button" disabled={!receipt} onClick={() => onSubmit(receipt)}
        className="mt-4 w-full rounded-md bg-teal-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-40"
      >
        Submit Payment
      </button>
    </Modal>
  );
}
