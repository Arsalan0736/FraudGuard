export default function SummaryCard({ label, value, accent = 'brand' }) {
  const accentMap = {
    brand: 'text-brand-700 bg-brand-50',
    rose:  'text-rose-700 bg-rose-50',
    amber: 'text-amber-700 bg-amber-50',
    emerald: 'text-emerald-700 bg-emerald-50',
  }
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className={`text-3xl font-bold ${accentMap[accent].split(' ')[0]}`}>
          {value}
        </span>
      </div>
    </div>
  )
}
