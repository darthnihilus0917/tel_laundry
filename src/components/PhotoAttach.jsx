import { useRef } from "react";
import { Camera } from "lucide-react";

// Real image attach: reads the file into a data URL (prototype — no upload backend).
export default function PhotoAttach({ label, url, onChange }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${url ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
      >
        <Camera size={12} /> {url ? `${label} attached — replace` : `Attach ${label}`}
      </button>
      {url && url.startsWith("data:") && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="h-10 w-10 rounded-md border border-slate-200 object-cover" />
        </a>
      )}
    </div>
  );
}
