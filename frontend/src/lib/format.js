export function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function riskClass(score) {
  if (score >= 75) return 'pill-high'
  if (score >= 40) return 'pill-med'
  return 'pill-low'
}

export function riskRowClass(score) {
  if (score >= 75) return 'bg-rose-50'
  if (score >= 40) return 'bg-amber-50'
  return 'bg-emerald-50/40'
}
