const ACCENTS = {
  brand:   { bar: 'bg-amber-500',   iconWrap: 'bg-amber-500/10 text-amber-300' },
  rose:    { bar: 'bg-rose-500',    iconWrap: 'bg-rose-500/10 text-rose-300' },
  emerald: { bar: 'bg-emerald-500', iconWrap: 'bg-emerald-500/10 text-emerald-300' },
  sky:     { bar: 'bg-sky-500',     iconWrap: 'bg-sky-500/10 text-sky-300' },
}

export default function SummaryCard({ label, value, sub, icon: Icon, accent = 'brand' }) {
  const tone = ACCENTS[accent] || ACCENTS.brand
  return (
    <div className="surface relative overflow-hidden">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${tone.bar}`} aria-hidden="true" />
      <div className="p-5 pl-6 flex items-start gap-4">
        <div className={`w-9 h-9 rounded-md grid place-items-center ${tone.iconWrap}`}>
          {Icon && <Icon size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>
          <div className="mt-1.5 num text-2xl font-bold text-slate-100 truncate">
            {value}
          </div>
          {sub && (
            <div className="mt-1 text-xs text-slate-500">{sub}</div>
          )}
        </div>
      </div>
    </div>
  )
}
