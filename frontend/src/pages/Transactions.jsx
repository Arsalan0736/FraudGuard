import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtMoney, fmtDate, riskClass } from '../lib/format'
import { SkeletonRows } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import { IconList, IconArrowLeft, IconArrowRight, IconSearch } from '../components/Icon'

export default function Transactions() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage] = useState(25)
  const [status, setStatus] = useState('')
  const [minRisk, setMinRisk] = useState('')
  const [sortDir, setSortDir] = useState('desc')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
  const rowClass = (score) =>
    score >= 75 ? 'row-high' : score >= 40 ? 'row-med' : 'row-low'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Transactions
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900 text-xs">
            <span className="text-slate-500 mr-1.5">Total</span>
            <span className="num text-slate-100 font-semibold">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* filter bar */}
      <div className="surface px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="f-status">Status</label>
          <select id="f-status" className="input min-w-[140px]"
                  value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }}>
            <option value="">all</option>
            <option value="flagged">flagged</option>
            <option value="pending">pending</option>
            <option value="cleared">cleared</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-risk">Min risk</label>
          <input id="f-risk" className="input w-32 num" type="number" min="0" max="100" placeholder="0"
                 value={minRisk} onChange={(e) => { setPage(1); setMinRisk(e.target.value) }} />
        </div>
        <div>
          <label className="label" htmlFor="f-sort">Sort by risk</label>
          <select id="f-sort" className="input min-w-[140px]"
                  value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">high to low</option>
            <option value="asc">low to high</option>
          </select>
        </div>
        {(status || minRisk) && (
          <button
            onClick={() => { setStatus(''); setMinRisk(''); setPage(1) }}
            className="btn-ghost ml-auto text-xs"
          >
            Reset filters
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <SkeletonRows rows={8} columns={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={IconList}
          title="No transactions match"
          description="Try clearing filters or adjusting the risk threshold."
        />
      ) : (
        <div className="surface p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Merchant</th>
                  <th>Location</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th className="text-right">Risk</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <tr key={tx.id} className={rowClass(tx.risk_score)}>
                    <td>
                      <Link to={`/transactions/${tx.id}`}
                            className="num text-amber-400 hover:text-amber-300">
                        #{tx.id}
                      </Link>
                    </td>
                    <td className="num font-semibold text-slate-100">
                      {fmtMoney(tx.amount)}
                    </td>
                    <td>
                      <div className="text-slate-100">{tx.merchant}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{tx.category}</div>
                    </td>
                    <td className="text-slate-300">{tx.location}</td>
                    <td className="text-slate-400 text-xs num">{fmtDate(tx.timestamp)}</td>
                    <td>
                      <span className={
                        tx.status === 'flagged' ? 'pill-flagged'
                        : tx.status === 'pending' ? 'pill-pending'
                        : 'pill-cleared'
                      }>
                        {tx.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`${riskClass(tx.risk_score)} num font-semibold`}>
                        {tx.risk_score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* pagination */}
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
