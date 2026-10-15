import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { compressImage } from "../utils/image.js";

// Single image attach. Every file is resized/compressed in the browser before it is kept or uploaded.
export default function PhotoAttach({ label, url, onChange, buttonText, required }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" aria-label={label} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${
          url ? "border-emerald-300 bg-emerald-50 text-emerald-700" : required ? "border-rose-300 text-slate-700 hover:bg-slate-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Camera size={13} /> {busy ? "Compressing…" : url ? `${buttonText || label} attached — replace` : buttonText || `Attach ${label}`}
      </button>
      {url && url.startsWith("data:") && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="h-10 w-10 rounded-md border border-slate-200 object-cover" />
        </a>
      )}
    </div>
  );
}

// Several photos at once (issue reports): unlimited feel, practical batch cap to avoid timeouts.
export function MultiPhotoAttach({ photos, onChange, max = 10 }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const room = max - photos.length;
    setNotice(files.length > room ? `Up to ${max} photos per report — extra photos were skipped.` : "");
    setBusy(true);
    try {
      const added = await Promise.all(files.slice(0, Math.max(0, room)).map(compressImage));
      onChange([...photos, ...added]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" aria-label="Upload a photo" />
      <button
        type="button"
        disabled={photos.length >= max}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Camera size={13} /> {busy ? "Compressing…" : "Upload a photo"}
      </button>
      {notice && <p className="mt-1 text-xs text-amber-700">{notice}</p>}
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <img src={p} alt={`Attachment ${i + 1}`} className="h-16 w-16 rounded-md border border-slate-200 object-cover" />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
