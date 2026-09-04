import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtMoney, fmtDate, riskClass } from '../lib/format'

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

  if (error) return <div className="text-rose-700">{error}</div>
  if (!tx) return <div className="text-slate-500">Loading…</div>

  return (
    <div className="space-y-5 max-w-4xl">
      <Link to="/transactions" className="text-sm text-brand-700 hover:underline">← back to transactions</Link>

      <div className="card">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Transaction #{tx.id}</h1>
          <span className={riskClass(tx.risk_score)}>{tx.risk_score.toFixed(1)} / 100</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
          <Field label="Amount"     value={fmtMoney(tx.amount)} />
          <Field label="Merchant"   value={`${tx.merchant} (${tx.category})`} />
          <Field label="Location"   value={tx.location} />
          <Field label="Timestamp"  value={fmtDate(tx.timestamp)} />
          <Field label="Account ID" value={tx.account_id} />
          <Field label="Status"     value={tx.status} />
        </div>
      </div>

      {tx.alert ? (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Alert · {tx.alert.rule_triggered}</h2>
          <p className="text-sm text-slate-600 mb-3">
            ML confidence: <strong>{tx.alert.ml_confidence.toFixed(1)}</strong> · Review:&nbsp;
            <span className={tx.alert.review_status === 'confirmed_fraud' ? 'pill-high'
                             : tx.alert.review_status === 'false_positive' ? 'pill-low' : 'pill-med'}>
              {tx.alert.review_status}
            </span>
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm leading-relaxed">
            <div className="text-xs uppercase text-slate-500 font-semibold mb-1">AI explanation</div>
            {tx.alert.explanation || 'No explanation available.'}
          </div>

          {tx.alert.review_status === 'pending' && (
            <div className="flex gap-3 mt-4">
              <button className="btn-danger" disabled={busy} onClick={() => review('confirmed_fraud')}>
                Confirm fraud
              </button>
              <button className="btn-ghost" disabled={busy} onClick={() => review('false_positive')}>
                Mark false positive
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-sm text-slate-500">No alert was raised for this transaction.</div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500 font-semibold">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}
