import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtMoney, fmtDate, riskClass } from '../lib/format'
import { Skeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import {
  IconAlert, IconCheck, IconClose, IconSparkle,
  IconArrowLeft, IconArrowRight, IconBell,
} from '../components/Icon'

export default function Alerts() {
  const [items, setItems] = useState([])
  const [reviewFilter, setReviewFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const { data } = await api.get('/alerts', {
        params: { page, per_page: perPage, review_status: reviewFilter },
      })
      let rows = data.items
      rows.sort((a, b) => (b.transaction?.risk_score ?? 0) - (a.transaction?.risk_score ?? 0))
      setItems(rows); setTotal(data.total)
    } catch (e) { setError(e?.response?.data?.error || 'failed to load') }
    finally { setLoading(false) }
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Queue</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Alerts
          </h1>
        </div>
        <div className="px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900 text-xs">
          <span className="text-slate-500 mr-1.5">Total</span>
          <span className="num text-slate-100 font-semibold">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* filter strip */}
      <div className="surface px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="a-filter">Review status</label>
          <select id="a-filter" className="input min-w-[180px]"
                  value={reviewFilter} onChange={(e) => { setPage(1); setReviewFilter(e.target.value) }}>
            <option value="pending">pending</option>
            <option value="confirmed_fraud">confirmed fraud</option>
            <option value="false_positive">false positive</option>
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={IconBell}
          title={reviewFilter === 'pending' ? 'Queue is clear' : 'No alerts in this view'}
          description={
            reviewFilter === 'pending'
              ? 'No outstanding alerts to review right now.'
              : 'Try a different review status filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const score = a.transaction?.risk_score ?? 0
            const tone = score >= 75 ? 'risk-high' : score >= 40 ? 'risk-med' : 'risk-low'
            return (
              <div key={a.id} className="surface p-5">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-md bg-amber-500/10 text-amber-300 grid place-items-center shrink-0">
                    <IconAlert size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link to={`/transactions/${a.transaction_id}`}
                            className="num text-amber-400 hover:text-amber-300 font-semibold">
                        Transaction #{a.transaction_id}
                      </Link>
                      <span className={`${riskClass(score)} num text-sm font-semibold`}>
                        risk {score.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500 num">
                        {a.rule_triggered}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      <span className="num text-slate-200 font-medium">
                        {fmtMoney(a.transaction?.amount)}
                      </span>{' '}
                      at {a.transaction?.merchant} · {a.transaction?.location} ·{' '}
                      <span className="text-xs">{fmtDate(a.transaction?.timestamp)}</span>
                    </div>

                    {a.explanation && (
                      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 leading-relaxed">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                          <IconSparkle size={11} />
                          <span>AI explanation</span>
                        </div>
                        {a.explanation}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {a.review_status === 'pending' ? (
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <button className="btn-danger" disabled={busyId === a.id}
                                onClick={() => review(a.id, 'confirmed_fraud')}>
                          <IconCheck size={14} /> Confirm
                        </button>
                        <button className="btn-outline" disabled={busyId === a.id}
                                onClick={() => review(a.id, 'false_positive')}>
                          <IconClose size={14} /> False positive
                        </button>
                      </div>
                    ) : (
                      <span className={
                        a.review_status === 'confirmed_fraud' ? 'pill-fraud' : 'pill-fp'
                      }>
                        {a.review_status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="num text-slate-200">{page}</span> of{' '}
            <span className="num text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-outline" disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}>
              <IconArrowLeft size={14} /> Prev
            </button>
            <button className="btn-outline" disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}>
              Next <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
