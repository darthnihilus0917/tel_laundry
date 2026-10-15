const TONES = {
  slate: "bg-slate-50 text-slate-700 border-slate-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className={`rounded-xl border p-4 ${TONES[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
        <Icon size={16} />
      </div>
      <div className="mt-2 text-2xl font-medium">{value}</div>
    </div>
  );
}
