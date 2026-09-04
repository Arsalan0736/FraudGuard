import { IconAlert } from './Icon'

export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="surface border-rose-500/30 bg-rose-500/5 text-rose-200 px-4 py-3 flex items-start gap-3"
    >
      <span className="mt-0.5 text-rose-400"><IconAlert size={16} /></span>
      <div className="text-sm leading-relaxed">
        <div className="font-semibold text-rose-100">Something went wrong</div>
        <div className="text-rose-200/80">{message}</div>
      </div>
    </div>
  )
}
