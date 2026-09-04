import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtMoney, fmtDate, riskClass } from '../lib/format'

export default function Alerts() {
  const [items, setItems] = useState([])
  const [reviewFilter, setReviewFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setError('')
    try {
      const { data } = await api.get('/alerts', {
        params: { page, per_page: perPage, review_status: reviewFilter },
      })
      let rows = data.items
      // sort pending by risk desc (from embedded transaction)
      rows.sort((a, b) => (b.transaction?.risk_score ?? 0) - (a.transaction?.risk_score ?? 0))
      setItems(rows); setTotal(data.total)
    } catch (e) { setError(e?.response?.data?.error || 'failed to load') }
  }

  useEffect(() => { load() }, [reviewFilter, page])

  async function review(alertId, status) {
    setBusyId(alertId)
    try {
      await api.patch(`/alerts/${alertId}`, { review_status: status })
      await load()
    } finally { setBusyId(null) }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alerts queue</h1>
        <div className="text-sm text-slate-500">{total.toLocaleString()} alerts</div>
      </div>

      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Review status</label>
          <select className="input" value={reviewFilter} onChange={(e) => { setPage(1); setReviewFilter(e.target.value) }}>
            <option value="pending">pending</option>
            <option value="confirmed_fraud">confirmed fraud</option>
            <option value="false_positive">false positive</option>
          </select>
        </div>
      </div>

      {error && <div className="text-rose-700">{error}</div>}

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Link to={`/transactions/${a.transaction_id}`} className="font-semibold text-brand-700 hover:underline">
                    Transaction #{a.transaction_id}
                  </Link>
                  <span className={riskClass(a.transaction?.risk_score ?? 0)}>
                    risk {(a.transaction?.risk_score ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500">{a.rule_triggered}</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {fmtMoney(a.transaction?.amount)} at {a.transaction?.merchant} · {a.transaction?.location} · {fmtDate(a.transaction?.timestamp)}
                </div>
                {a.explanation && (
                  <p className="mt-3 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded p-3">
                    {a.explanation}
                  </p>
                )}
              </div>
              {a.review_status === 'pending' ? (
                <div className="flex flex-col gap-2 shrink-0">
                  <button className="btn-danger" disabled={busyId === a.id} onClick={() => review(a.id, 'confirmed_fraud')}>
                    Confirm
                  </button>
                  <button className="btn-ghost" disabled={busyId === a.id} onClick={() => review(a.id, 'false_positive')}>
                    False positive
                  </button>
                </div>
              ) : (
                <span className={a.review_status === 'confirmed_fraud' ? 'pill-high' : 'pill-low'}>
                  {a.review_status.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card text-center text-slate-400">no alerts in this view</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">Page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      </div>
    </div>
  )
}
