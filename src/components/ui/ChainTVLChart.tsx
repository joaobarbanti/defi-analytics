'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatTVL } from '@/lib/transforms/format'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChainTVLPoint {
  date: number
  tvl: number
}

interface ChainHistoryResponse {
  chain: string
  points: ChainTVLPoint[]
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
}) {
  if (!active || !payload?.length) return null
  const tvl = payload[0].value
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 text-xs">
      <span className="font-semibold text-white">{formatTVL(tvl)}</span>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface ChainTVLChartProps {
  chain: string
  accentColor?: string
}

export function ChainTVLChart({ chain, accentColor = '#60a5fa' }: ChainTVLChartProps) {
  const [points, setPoints] = useState<ChainTVLPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chain) return
    setLoading(true)
    setError(null)

    fetch(`/api/chain-history/${encodeURIComponent(chain)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: ChainHistoryResponse = await res.json()
        setPoints(data.points)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => setLoading(false))
  }, [chain])

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" />
      </div>
    )
  }

  if (error || points.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-xs text-white/30">
          {error ?? 'No history available'}
        </p>
      </div>
    )
  }

  // Format x-axis dates
  const fmt = (ts: number) => {
    const d = new Date(ts * 1000)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  // Show only first + mid + last labels to avoid crowding
  const tickIndices = new Set([
    0,
    Math.floor(points.length / 2),
    points.length - 1,
  ])

  const ticks = points
    .map((p, i) => (tickIndices.has(i) ? p.date : null))
    .filter((t): t is number => t !== null)

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${chain}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={fmt}
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatTVL(v)}
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="tvl"
            stroke={accentColor}
            strokeWidth={1.5}
            fill={`url(#grad-${chain})`}
            dot={false}
            activeDot={{ r: 3, fill: accentColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
