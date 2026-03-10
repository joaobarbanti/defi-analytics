'use client'

import { useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { useDefiStore } from '@/store/defi'
import { useProtocolDetail } from '@/hooks/useProtocolDetail'
import { useYields } from '@/hooks/useYields'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { TrendLabelBadge } from '@/components/ui/TrendLabelBadge'
import { assignNodeColor } from '@/lib/transforms/normalizeProtocol'
import { formatTVL, formatAPY, formatChange, formatPct } from '@/lib/transforms/format'
import InvestLink from '@/components/ui/InvestLink'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  return 0
}

// Palette for chain donut slices
const CHAIN_COLORS = [
  '#6366f1', '#22d3ee', '#a78bfa', '#34d399', '#f59e0b',
  '#f43f5e', '#60a5fa', '#fb923c', '#4ade80', '#e879f9',
]

// ── Growth Intelligence Section ──────────────────────────────────────────────

interface GrowthIntelProps {
  slug: string
  color: string
}

function GrowthIntelSection({ slug, color }: GrowthIntelProps) {
  const analytics = useDefiStore((s) => s.analytics)
  const growthMetrics = analytics?.growthMetrics ?? {}
  const metrics = growthMetrics[slug]

  if (!metrics) return null

  const est30d = metrics.tvl30dChange
  const est30dFmt = est30d != null
    ? formatPct(est30d, { decimals: 1 })
    : null

  const rankChip = metrics.rankChange !== 0 && (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${
        metrics.rankChange > 0
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'bg-red-500/15 text-red-400'
      }`}
    >
      {metrics.rankChange > 0 ? '▲' : '▼'}&nbsp;
      {Math.abs(metrics.rankChange)}
    </span>
  )

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ borderColor: `${color}33`, background: `${color}08` }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
        Growth Intelligence
      </h3>

      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">Trend</span>
        <TrendLabelBadge label={metrics.trendLabel} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">Momentum Score</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, (metrics.momentumScore + 100) / 3))}%`,
                background: metrics.momentumScore >= 0 ? color : '#ef4444',
              }}
            />
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: metrics.momentumScore >= 0 ? color : '#ef4444' }}
          >
            {metrics.momentumScore > 0 ? '+' : ''}
            {Math.round(metrics.momentumScore)}
          </span>
        </div>
      </div>

      {est30dFmt && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Est. 30d TVL Change</span>
          <span
            className={`text-sm font-semibold ${
              (est30d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {est30dFmt}
            <span className="ml-1 text-xs text-white/30">(est.)</span>
          </span>
        </div>
      )}

      {metrics.rankChange !== 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Rank Change</span>
          {rankChip}
        </div>
      )}
    </div>
  )
}

// ── Liquidity Signal Section ──────────────────────────────────────────────────

interface LiquiditySignalProps {
  slug: string
}

function LiquiditySignalSection({ slug }: LiquiditySignalProps) {
  const analytics = useDefiStore((s) => s.analytics)
  const flows = analytics?.flows ?? []

  // Find flows that mention this protocol's chains (rough signal)
  // We'll use the chainTvls from the selected protocol instead
  const protocolFlows = flows.filter(
    (f) => f.id.startsWith(slug) || f.id.endsWith(slug)
  )

  if (protocolFlows.length === 0) return null

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
        Liquidity Signals
      </h3>
      {protocolFlows.slice(0, 3).map((flow) => (
        <div
          key={flow.id}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-white/60">
            {flow.sourceChain} → {flow.destChain}
          </span>
          <span
            className={`font-semibold ${flow.netFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {flow.netFlow >= 0 ? '+' : ''}{formatTVL(flow.netFlow)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Chain Dominance Donut ─────────────────────────────────────────────────────

interface ChainDonutProps {
  chainTvls: Record<string, number>
}

function ChainDonutChart({ chainTvls }: ChainDonutProps) {
  const entries = Object.entries(chainTvls)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  if (entries.length < 2) return null

  const total = entries.reduce((s, [, v]) => s + v, 0)
  const pieData = entries.map(([name, value]) => ({
    name,
    value,
    share: (value / total) * 100,
  }))

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-white/70">
        Chain Distribution
      </h3>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={46}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHAIN_COLORS[i % CHAIN_COLORS.length]}
                    opacity={0.85}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-1">
          {pieData.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    background: CHAIN_COLORS[i % CHAIN_COLORS.length],
                    opacity: 0.9,
                  }}
                />
                <span className="text-xs text-white/60 truncate max-w-[70px]">
                  {d.name}
                </span>
              </div>
              <span className="text-xs font-medium text-white/80">
                  {formatPct(d.share, { decimals: 1, signed: false })}
                </span>
            </div>
          ))}
          {pieData.length > 5 && (
            <p className="text-xs text-white/30 pl-3.5">
              +{pieData.length - 5} more chains
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function ProtocolPanel() {
  const { selectedProtocol, isPanelOpen, setSelectedProtocol, setPanelOpen } =
    useDefiStore()
  const { detail, isLoading } = useProtocolDetail(
    selectedProtocol?.slug ?? null
  )
  const { pools } = useYields()

  // suppress unused warning — setPanelOpen is wired in store
  void setPanelOpen

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProtocol(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelectedProtocol])

  if (!isPanelOpen || !selectedProtocol) return null

  const color = assignNodeColor(selectedProtocol.category)
  const change1d = formatChange(selectedProtocol.change_1d)
  const change7d = formatChange(selectedProtocol.change_7d)

  // Protocol pools from yields
  const protocolPools = pools
    .filter((p) => p.project === selectedProtocol.slug)
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))
    .slice(0, 5)

  // APY distribution data for bar chart
  const apyData = protocolPools.map((p) => ({
    name: p.symbol.slice(0, 12),
    apy: p.apy ?? 0,
  }))

  // TVL history
  const tvlHistory = detail?.tvlHistory
    ? detail.tvlHistory
        .slice(-90)
        .map((d) => ({
          date: formatDate(d.date),
          tvl: d.totalLiquidityUSD,
        }))
    : []

  const avgAPY =
    protocolPools.length > 0
      ? protocolPools.reduce((sum, p) => sum + (p.apy ?? 0), 0) /
        protocolPools.length
      : null

  // Chain TVLs for donut chart
  const chainTvls: Record<string, number> =
    (selectedProtocol as unknown as { chainTvls?: Record<string, number> })
      .chainTvls ?? {}

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div
        className="flex items-start justify-between border-b border-white/10 p-6"
        style={{ borderBottomColor: `${color}44` }}
      >
        <div className="flex items-center gap-3">
          {selectedProtocol.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedProtocol.logo}
              alt={selectedProtocol.name}
              className="h-10 w-10 rounded-full object-contain"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <div>
            <h2 className="text-lg font-bold text-white">
              {selectedProtocol.name}
            </h2>
            <p className="text-sm text-white/50">{selectedProtocol.symbol}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={color}>{selectedProtocol.category}</Badge>
          <button
            onClick={() => setSelectedProtocol(null)}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-6">
        {/* Chains */}
        <div className="flex flex-wrap gap-1.5">
          {selectedProtocol.chains.slice(0, 8).map((chain) => (
            <span
              key={chain}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/60"
            >
              {chain}
            </span>
          ))}
        </div>

        {/* TVL Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/40">TVL</p>
            <p className="mt-0.5 text-base font-bold text-white">
              {formatTVL(selectedProtocol.tvl)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/40">1d Change</p>
            <p
              className={`mt-0.5 text-base font-bold ${
                change1d.positive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {change1d.text}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/40">7d Change</p>
            <p
              className={`mt-0.5 text-base font-bold ${
                change7d.positive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {change7d.text}
            </p>
          </div>
        </div>

        {/* ── Growth Intelligence ── */}
        <GrowthIntelSection slug={selectedProtocol.slug} color={color} />

        {/* TVL History Chart */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white/70">
            TVL History (90d)
          </h3>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : tvlHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={tvlHistory}>
                <defs>
                  <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => formatTVL(toNum(v))}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(v) => [formatTVL(toNum(v)), 'TVL']}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#f8fafc',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tvl"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#tvlGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-white/30">No TVL history available</p>
          )}
        </div>

        {/* ── Chain Distribution Donut ── */}
        {Object.keys(chainTvls).length >= 2 && (
          <ChainDonutChart chainTvls={chainTvls} />
        )}

        {/* ── Liquidity Signal ── */}
        <LiquiditySignalSection slug={selectedProtocol.slug} />

        {/* APY Section */}
        {avgAPY != null && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">Average Pool APY</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatAPY(avgAPY)}
              </p>
            </div>
          </div>
        )}

        {/* Where to Invest */}
        <InvestLink
          protocolSlug={selectedProtocol.slug}
          protocolUrl={selectedProtocol.url}
        />

        {/* APY Distribution */}
        {apyData.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white/70">
              APY by Pool
            </h3>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={apyData} barSize={14}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => [formatAPY(toNum(v)), 'APY']}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#f8fafc',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="apy" radius={[4, 4, 0, 0]}>
                  {apyData.map((_, i) => (
                    <Cell
                      key={i}
                      fill="#10b981"
                      fillOpacity={0.7 + (i / apyData.length) * 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Pools */}
        {protocolPools.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white/70">
              Top Pools
            </h3>
            <div className="space-y-2">
              {protocolPools.map((pool) => (
                <div
                  key={pool.pool}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-white">
                      {pool.symbol}
                    </p>
                    <p className="text-xs text-white/40">{pool.chain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-400">
                        {formatAPY(pool.apy)}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatTVL(pool.tvlUsd)}
                      </p>
                    </div>
                    <a
                      href={`https://defillama.com/yields/pool/${pool.pool}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View pool on DeFiLlama"
                      className="flex-shrink-0 text-cyan-500 hover:text-cyan-300 transition-colors text-sm leading-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
