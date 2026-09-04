import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtMoney, fmtDate, riskClass, riskRowClass } from '../lib/format'

export default function Transactions() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage] = useState(25)
  const [status, setStatus] = useState('')
  const [minRisk, setMinRisk] = useState('')
  const [sortDir, setSortDir] = useState('desc')  // by risk_score
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const params = { page, per_page: perPage }
      if (status) params.status = status
      if (minRisk) params.min_risk_score = minRisk
      const { data } = await api.get('/transactions', { params })
      let rows = data.items
      rows.sort((a, b) => sortDir === 'desc'
        ? b.risk_score - a.risk_score
        : a.risk_score - b.risk_score)
      setItems(rows); setTotal(data.total)
    } catch (e) { setError(e?.response?.data?.error || 'failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, status, minRisk, sortDir])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="text-sm text-slate-500">{total.toLocaleString()} total</div>
      </div>

      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }}>
            <option value="">all</option>
            <option value="flagged">flagged</option>
            <option value="pending">pending</option>
            <option value="cleared">cleared</option>
          </select>
        </div>
        <div>
          <label className="label">Min risk</label>
          <input className="input w-32" type="number" min="0" max="100" placeholder="0"
                 value={minRisk} onChange={(e) => { setPage(1); setMinRisk(e.target.value) }} />
        </div>
        <div>
          <label className="label">Sort by risk</label>
          <select className="input" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">high → low</option>
            <option value="asc">low → high</option>
          </select>
        </div>
      </div>

      {error && <div className="text-rose-700">{error}</div>}
      {loading && <div className="text-slate-500">Loading…</div>}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Merchant</th>
              <th className="text-left px-4 py-3">Location</th>
              <th className="text-left px-4 py-3">Timestamp</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tx) => (
              <tr key={tx.id} className={`table-row hover:bg-slate-50 ${riskRowClass(tx.risk_score)}`}>
                <td className="px-4 py-3">
                  <Link to={`/transactions/${tx.id}`} className="text-brand-700 hover:underline">#{tx.id}</Link>
                </td>
                <td className="px-4 py-3 font-medium">{fmtMoney(tx.amount)}</td>
                <td className="px-4 py-3">{tx.merchant} <span className="text-slate-400 text-xs">({tx.category})</span></td>
                <td className="px-4 py-3">{tx.location}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(tx.timestamp)}</td>
                <td className="px-4 py-3">
                  <span className={tx.status === 'flagged' ? 'pill-high' : tx.status === 'pending' ? 'pill-med' : 'pill-low'}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={riskClass(tx.risk_score)}>{tx.risk_score.toFixed(1)}</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">no transactions</td></tr>
            )}
          </tbody>
        </table>
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
