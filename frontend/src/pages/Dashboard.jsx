import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { api } from '../lib/api'
import SummaryCard from '../components/SummaryCard'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/analytics/summary').then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || 'failed to load summary'))
  }, [])

  if (error) return <div className="text-rose-700">{error}</div>
  if (!data) return <div className="text-slate-500">Loading…</div>

  const chartData = data.daily_series.map((d) => ({ ...d, day: d.date.slice(5) }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total transactions" value={data.total_transactions.toLocaleString()} accent="brand" />
        <SummaryCard label="Flagged today" value={data.flagged_today.toLocaleString()} accent="rose" />
        <SummaryCard label="Fraud rate" value={`${data.fraud_rate_pct}%`} accent="amber" />
        <SummaryCard label="Pending alerts" value={data.pending_alerts.toLocaleString()} accent="emerald" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Flagged transactions · last 30 days</h2>
          <Link to="/alerts" className="text-sm text-brand-700 hover:underline">Open alerts queue →</Link>
        </div>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="flagged" stroke="#e11d48" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cleared" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-slate-500">Average risk score</div>
          <div className="text-2xl font-bold mt-1">{data.avg_risk_score} / 100</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Flagged total</div>
          <div className="text-2xl font-bold mt-1">{data.flagged_total.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Pending alerts</div>
          <div className="text-2xl font-bold mt-1">{data.pending_alerts.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
