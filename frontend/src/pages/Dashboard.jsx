import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { api } from '../lib/api'
import SummaryCard from '../components/SummaryCard'
import { Skeleton, SkeletonRows } from '../components/Skeleton'
import ErrorBanner from '../components/ErrorBanner'
import {
  IconCash, IconBell, IconTrend, IconAlert, IconLayers,
} from '../components/Icon'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/analytics/summary').then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || 'failed to load summary'))
  }, [])

  if (error) return <ErrorBanner message={error} />
  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[340px]" />
      </div>
    )
  }

  const chartData = data.daily_series.map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit' }),
  }))

  const last7 = data.daily_series.slice(-7)
  const recentFlagged = last7.reduce((s, d) => s + d.flagged, 0)

  return (
    <div className="space-y-8">
      {/* page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Overview
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Risk operations
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Real-time fraud scoring across the live transaction stream.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="live-dot" aria-hidden="true" />
          <span>Updated just now</span>
        </div>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total transactions"
          value={data.total_transactions.toLocaleString()}
          sub="All time"
          icon={IconCash}
          accent="brand"
        />
        <SummaryCard
          label="Flagged today"
          value={data.flagged_today.toLocaleString()}
          sub={recentFlagged > 0 ? `${recentFlagged} in last 7d` : 'no recent flags'}
          icon={IconAlert}
          accent="rose"
        />
        <SummaryCard
          label="Fraud rate"
          value={`${data.fraud_rate_pct}%`}
          sub="share of flagged transactions"
          icon={IconTrend}
          accent="rose"
        />
        <SummaryCard
          label="Pending alerts"
          value={data.pending_alerts.toLocaleString()}
          sub="awaiting analyst review"
          icon={IconBell}
          accent="emerald"
        />
      </div>

      {/* chart */}
      <div className="surface p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Trend
            </div>
            <h2 className="text-lg font-semibold text-slate-100 mt-0.5">
              Flagged vs cleared, last 30 days
            </h2>
          </div>
          <Link to="/alerts" className="text-xs text-amber-400 hover:text-amber-300">
            Open alerts queue
          </Link>
        </div>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 6, right: 18, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="rgb(30 41 59)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day"
                     tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }}
                     stroke="rgb(51 65 85)" />
              <YAxis allowDecimals={false}
                     tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }}
                     stroke="rgb(51 65 85)" />
              <Tooltip
                contentStyle={{
                  background: 'rgb(15 23 42)',
                  border: '1px solid rgb(51 65 85)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'rgb(226 232 240)' }}
                itemStyle={{ color: 'rgb(148 163 184)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(148 163 184)' }} />
              <Line type="monotone" dataKey="flagged" stroke="rgb(244 63 94)"  strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cleared" stroke="rgb(16 185 129)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pending" stroke="rgb(245 158 11)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Average risk score
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num text-3xl font-bold text-slate-100">
              {data.avg_risk_score}
            </span>
            <span className="text-sm text-slate-500">/ 100</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${data.avg_risk_score}%` }} />
          </div>
        </div>
        <div className="surface p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Flagged total
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num text-3xl font-bold text-slate-100">
              {data.flagged_total.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            of {data.total_transactions.toLocaleString()} processed
          </div>
        </div>
        <div className="surface p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Pending alerts
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num text-3xl font-bold text-slate-100">
              {data.pending_alerts.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <IconLayers size={12} /> queued for review
          </div>
        </div>
      </div>
    </div>
  )
}
