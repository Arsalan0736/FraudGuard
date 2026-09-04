import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtMoney, fmtDate, riskClass } from '../lib/format'
import { Skeleton } from '../components/Skeleton'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import {
  IconArrowLeft, IconCheck, IconClose, IconAlert, IconSparkle, IconMap, IconClock, IconCash,
} from '../components/Icon'

export default function TransactionDetail() {
  const { id } = useParams()
  const [tx, setTx] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { data } = await api.get(`/transactions/${id}`)
      setTx(data)
    } catch (e) { setError(e?.response?.data?.error || 'failed to load') }
  }
  useEffect(() => { load() }, [id])

  async function review(status) {
    if (!tx?.alert) return
    setBusy(true)
    try {
      await api.patch(`/alerts/${tx.alert.id}`, { review_status: status })
      await load()
    } finally { setBusy(false) }
  }

  if (error) return <ErrorBanner message={error} />
  if (!tx) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-28" />
      </div>
    )
  }

  const scoreTone = tx.risk_score >= 75 ? 'risk-high'
                  : tx.risk_score >= 40 ? 'risk-med' : 'risk-low'

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/transactions"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
        <IconArrowLeft size={14} /> Back to transactions
      </Link>

      {/* header card */}
      <div className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Transaction
            </div>
            <h1 className="text-2xl font-bold text-slate-100 num mt-1">
              #{tx.id}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={
              tx.status === 'flagged' ? 'pill-flagged'
              : tx.status === 'pending' ? 'pill-pending'
              : 'pill-cleared'
            }>
              {tx.status}
            </span>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Risk</div>
              <div className={`num text-2xl font-bold ${scoreTone}`}>
                {tx.risk_score.toFixed(1)}<span className="text-slate-500 text-sm">/100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hairline-t mt-5 pt-5 grid grid-cols-2 md:grid-cols-3 gap-5">
          <Field icon={IconCash}  label="Amount"    value={fmtMoney(tx.amount)} mono />
          <Field icon={IconMap}   label="Location"  value={tx.location} />
          <Field icon={IconClock} label="Timestamp" value={fmtDate(tx.timestamp)} />
          <Field label="Merchant" value={`${tx.merchant}`} sub={tx.category} />
          <Field label="Account"  value={`#${tx.account_id}`} mono />
          <Field label="Status"   value={tx.status} />
        </div>
      </div>

      {/* alert card */}
      {tx.alert ? (
        <div className="surface overflow-hidden">
          <div className="px-6 py-4 hairline-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-300 grid place-items-center">
                <IconAlert size={14} />
              </span>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Alert</div>
                <div className="text-sm text-slate-100 font-medium">
                  {tx.alert.rule_triggered}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">ML conf.</div>
                <div className="num text-slate-100 font-semibold">
                  {tx.alert.ml_confidence.toFixed(1)}
                </div>
              </div>
              <span className={
                tx.alert.review_status === 'confirmed_fraud' ? 'pill-fraud'
                : tx.alert.review_status === 'false_positive' ? 'pill-fp'
                : 'pill-pending'
              }>
                {tx.alert.review_status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
                <IconSparkle size={12} />
                <span>AI explanation</span>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-4 text-sm leading-relaxed text-slate-200">
                {tx.alert.explanation || 'No explanation available.'}
              </div>
            </div>

            {tx.alert.review_status === 'pending' ? (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className="btn-danger" disabled={busy} onClick={() => review('confirmed_fraud')}>
                  <IconCheck size={14} /> Confirm fraud
                </button>
                <button className="btn-outline" disabled={busy} onClick={() => review('false_positive')}>
                  <IconClose size={14} /> Mark false positive
                </button>
                <span className="text-xs text-slate-500 ml-auto">
                  Your decision will be recorded against your account.
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-500 pt-2">
                Reviewed. Status: <span className="text-slate-200 font-medium">
                  {tx.alert.review_status.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={IconCheck}
          title="No alert was raised"
          description="This transaction passed all rule and ML checks."
        />
      )}
    </div>
  )
}

function Field({ label, value, sub, icon: Icon, mono = false }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {Icon && <Icon size={11} />}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-slate-100 ${mono ? 'num' : ''}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}
