'use client'

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface SparklineProps {
  /** Array of TVL values (most recent last) */
  data: number[]
  color?: string
  height?: number
  width?: number
}

/**
 * Minimal inline sparkline chart using Recharts.
 * Renders a tiny line graph with no axes — just the trend shape.
 */
export function Sparkline({
  data,
  color = '#10b981',
  height = 32,
  width = 72,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="rounded opacity-20 bg-white/5" />
  }

  const chartData = data.map((value, i) => ({ i, value }))

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Tooltip
          formatter={(v: unknown) => [`$${(typeof v === 'number' ? v / 1e9 : 0).toFixed(2)}B`, 'TVL']}
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 6,
            color: '#f8fafc',
            fontSize: 11,
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
