import { MessageCircle, Image as ImageIcon } from "lucide-react";
import { formatDateTime } from "../utils/time.js";
import { MESSENGER_LIMIT } from "../utils/notify.js";

// Preview of every automated group-chat message the system generated. The prototype has no
// Messenger connection; this is exactly the text/attachments a bot would post.
export default function Outbox({ outbox, orders, customers }) {
  return (
    <div>
      <h1 className="text-lg font-medium">Group chat outbox</h1>
      <p className="mt-1 text-sm text-slate-500">
        Automated Messenger messages (pick-up summary and payment receipts). Each message is split to stay under Messenger's {MESSENGER_LIMIT.toLocaleString()}-character limit.
      </p>

      {outbox.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Nothing sent yet — new pick-up requests and receipts appear here.</div>
      )}

      <div className="mt-4 space-y-3">
        {outbox.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium text-slate-700"><MessageCircle size={13} /> {m.channel}</span>
              <span>{formatDateTime(m.ts)}</span>
            </div>
            <div className="mt-2 space-y-2">
              {m.parts.map((text, i) => (
                <pre key={i} className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs text-slate-800">{text}</pre>
              ))}
            </div>
            {(m.attachments || []).map((a, i) => {
              const order = orders.find((o) => o.id === a.orderId);
              const url = order?.[a.field];
              const name = customers.find((c) => c.id === order?.customerId)?.name;
              return (
                <div key={i} className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  {url ? <img src={url} alt={a.caption} className="h-16 w-16 rounded-md border border-slate-200 object-cover" /> : <ImageIcon size={16} className="text-slate-300" />}
                  <span>{a.caption || (name ? `Photo for ${name}` : "Photo")}{!url && " (photo expired or removed)"}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
