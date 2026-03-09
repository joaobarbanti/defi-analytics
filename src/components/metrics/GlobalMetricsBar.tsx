'use client'

import { Skeleton } from '@/components/ui/Skeleton'
import { formatTVL, formatAPY } from '@/lib/transforms/format'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  loading?: boolean
  accent?: string
}

export function MetricCard({ label, value, sub, loading, accent = '#3b82f6' }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
      {/* Glow accent */}
      <div
        className="absolute -top-6 -right-6 h-16 w-16 rounded-full blur-2xl opacity-30"
        style={{ backgroundColor: accent }}
      />
      <p className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-32" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-white" style={{ textShadow: `0 0 20px ${accent}88` }}>
          {value}
        </p>
      )}
      {sub && !loading && (
        <p className="mt-0.5 text-xs text-white/40">{sub}</p>
      )}
    </div>
  )
}

interface GlobalMetricsBarProps {
  totalTVL: number | null
  protocolCount: number | null
  avgAPY: number | null
  safeAvgAPY: number | null
  topChain: { name: string; tvl: number } | null
  loading: boolean
}

export function GlobalMetricsBar({
  totalTVL,
  protocolCount,
  avgAPY,
  safeAvgAPY,
  topChain,
  loading,
}: GlobalMetricsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-5 sm:px-8">
      <MetricCard
        label="Total DeFi TVL"
        value={formatTVL(totalTVL ?? undefined)}
        loading={loading}
        accent="#3b82f6"
      />
      <MetricCard
        label="Protocols Tracked"
        value={protocolCount != null ? protocolCount.toLocaleString() : '…'}
        loading={loading}
        accent="#8b5cf6"
      />
      <MetricCard
        label="Avg Pool APY"
        value={formatAPY(avgAPY ?? undefined)}
        loading={loading}
        accent="#10b981"
      />
      <MetricCard
        label="Safe Avg APY"
        value={formatAPY(safeAvgAPY ?? undefined)}
        sub="Low-risk pools only"
        loading={loading}
        accent="#34d399"
      />
      <MetricCard
        label="Top Chain by TVL"
        value={topChain?.name ?? '…'}
        sub={topChain ? formatTVL(topChain.tvl) : undefined}
        loading={loading}
        accent="#f59e0b"
      />
    </div>
  )
}
