import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import Badge from "./Badge.jsx";
import Modal from "./Modal.jsx";
import ReasonModal from "./ReasonModal.jsx";
import { personName, packagesUnitPrice, methodLabel } from "../utils/helpers.js";
import { formatDateTime, formatLongDate } from "../utils/time.js";

const STATUS_BADGE = {
  "Pending Verification": "bg-purple-50 text-purple-700 border-purple-300",
  "Verified": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "Shortage Logged": "bg-red-50 text-red-700 border-red-300",
  "Awaiting Re-upload": "bg-red-50 text-red-700 border-red-300",
};

function ShortageModal({ onConfirm, onClose }) {
  const [amount, setAmount] = useState("");
  const n = Number(amount);
  return (
    <Modal title="How much was the cash shortage?" onClose={onClose}>
      <input
        type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
        placeholder="Shortage amount (₱)" aria-label="Shortage amount"
        className="w-full rounded-md border border-slate-200 px-2.5 py-2.5 text-sm"
      />
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Back</button>
        <button disabled={!(n > 0)} onClick={() => onConfirm(n)} className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Log shortage</button>
      </div>
    </Modal>
  );
}

export default function Payments({ orders, customers, verifyPayment, rejectCash, rejectReceipt, highlightId }) {
  const rows = orders.filter((o) => o.paymentStatus !== "Unpaid").sort((a, b) => (b.paymentTs ?? 0) - (a.paymentTs ?? 0));
  const [receipt, setReceipt] = useState(null); // order whose receipt is open
  const [rejecting, setRejecting] = useState(null); // order being rejected
  const highlightRef = useRef(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView?.({ block: "center" });
  }, [highlightId]);

  const amountOf = (o) => o.price ?? packagesUnitPrice(o);

  return (
    <div>
      <h1 className="text-lg font-medium">Payments &amp; cash log</h1>
      <p className="mt-1 text-sm text-slate-500">Master financial ledger — approving or rejecting here updates the dispatch board and the customer's order card.</p>

      {rows.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">No payments logged yet.</div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {["Order Date", "Order ID", "Customer Name", "Method", "Amount", "Ref", "Payment Date", "Status", "Verification Date", "Handled By", "Actions"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const short = o.paymentStatus === "Shortage Logged";
              const isHighlight = o.id === highlightId;
              return (
                <tr
                  key={o.id} ref={isHighlight ? highlightRef : null}
                  className={`border-t border-slate-100 ${isHighlight ? "bg-amber-50" : "hover:bg-slate-50"}`}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">{formatLongDate(o.createdTs)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{o.id}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{personName(customers, o.customerId)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{methodLabel(o.paymentMethod)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${short ? "font-medium text-red-600" : ""}`}>
                    ₱{amountOf(o)}{short && ` (Short: ${o.shortage})`}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {o.paymentMethod === "GCash" && o.receiptUrl ? (
                      <button onClick={() => setReceipt(o)} aria-label={`View receipt for ${o.id}`} className="text-teal-700 hover:text-teal-900"><ImageIcon size={16} /></button>
                    ) : o.gcashRef ? `•••${o.gcashRef}` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">{o.paymentTs ? formatDateTime(o.paymentTs) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2"><Badge className={STATUS_BADGE[o.paymentStatus]}>{o.paymentStatus}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">{o.verifiedTs ? formatDateTime(o.verifiedTs) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">{o.verifiedBy || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {o.paymentStatus === "Pending Verification" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => verifyPayment(o.id)} className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900">Verify Payment</button>
                        <button onClick={() => setRejecting(o)} className="rounded-md border border-red-400 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {receipt && (
        <Modal title={`Receipt — ${receipt.id}`} onClose={() => setReceipt(null)}>
          <img src={receipt.receiptUrl} alt="Uploaded payment receipt" className="w-full rounded-lg border border-slate-200" />
          <button onClick={() => setReceipt(null)} className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Close</button>
        </Modal>
      )}

      {rejecting && rejecting.paymentMethod === "Cash" && (
        <ShortageModal onClose={() => setRejecting(null)} onConfirm={(amt) => { rejectCash(rejecting.id, amt); setRejecting(null); }} />
      )}
      {rejecting && rejecting.paymentMethod !== "Cash" && (
        <ReasonModal kind="receipt" onClose={() => setRejecting(null)} onConfirm={(reason) => { rejectReceipt(rejecting.id, reason); setRejecting(null); }} />
      )}
    </div>
  );
}
