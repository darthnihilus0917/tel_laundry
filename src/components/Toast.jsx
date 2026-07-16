import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-lg">
        <CheckCircle2 size={16} />
        {message}
        <button onClick={onClose} aria-label="Dismiss" className="ml-1 text-emerald-500 hover:text-emerald-700">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
