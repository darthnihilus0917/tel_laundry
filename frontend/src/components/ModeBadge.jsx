import { IS_API } from "../api.js";

// Tells the viewer which data mode this build is running in.
export default function ModeBadge() {
  return (
    <div
      className={`pointer-events-none fixed bottom-2 right-2 z-[60] rounded-full px-2.5 py-1 text-[10px] font-medium text-white shadow ${
        IS_API ? "bg-emerald-700/90" : "bg-slate-800/80"
      }`}
    >
      {IS_API ? "Live · connected to server" : "Prototype · sample data saved in this browser only"}
    </div>
  );
}
