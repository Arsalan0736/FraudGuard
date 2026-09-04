import { IconShield } from './Icon'

export default function EmptyState({ icon: Icon = IconShield, title, description, action }) {
  return (
    <div className="surface flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-10 h-10 rounded-full bg-slate-800/80 grid place-items-center text-slate-400 mb-4">
        <Icon size={18} />
      </div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 mt-1 max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
