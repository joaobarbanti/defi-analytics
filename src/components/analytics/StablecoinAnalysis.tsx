'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useDefiStore } from '@/store/defi'
import { formatTVL, formatPct } from '@/lib/transforms/format'
import type { StablecoinAssetMetrics } from '@/types/analytics'

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = [
  '#6366f1', '#22d3ee', '#a78bfa', '#34d399',
  '#f59e0b', '#f43f5e', '#60a5fa', '#fb923c',
]

const PEG_MECHANISM_LABEL: Record<string, { label: string; color: string }> = {
  fiat:         { label: 'Fiat',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  crypto:       { label: 'Crypto', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  algorithmic:  { label: 'Algo',   color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
}

const DEPEG_THRESHOLD = 0.005 // 0.5 %

// ── Helpers ───────────────────────────────────────────────────────────────────

function PegMechanismBadge({ mechanism }: { mechanism: string | null }) {
  if (!mechanism) return null
  const key = mechanism.toLowerCase()
  const cfg = PEG_MECHANISM_LABEL[key] ?? {
    label: mechanism,
    color: 'bg-white/10 text-white/50 border-white/10',
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${cfg.color}`}
    >
      {cfg.label}
    </span>
  )
}

function PegHealthBar({ price }: { price: number | null }) {
  if (price === null) return null

  const deviation = Math.abs(price - 1)
  const isDepegged = deviation > DEPEG_THRESHOLD

  // Bar fill: 0 = perfect peg, 1 = fully depegged (>2%)
  const fillPct = Math.min((deviation / 0.02) * 100, 100)

  const barColor = isDepegged
    ? deviation > 0.02 ? '#f43f5e' : '#f59e0b'
    : '#34d399'

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${fillPct}%`, background: barColor }}
        />
      </div>
      {/* 4 decimals intentional — stablecoin price precision matters */}
      <span
        className={`text-[10px] font-medium tabular-nums ${
          isDepegged ? 'text-amber-400' : 'text-emerald-400'
        }`}
      >
        ${price.toFixed(4)}
      </span>
    </div>
  )
}

function DepegAlert({ assets }: { assets: StablecoinAssetMetrics[] }) {
  const depegged = assets.filter(
    (a) => a.price !== null && Math.abs(a.price! - 1) > DEPEG_THRESHOLD
  )

  if (depegged.length === 0) return null

  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <span className="mt-0.5 text-amber-400 text-sm flex-shrink-0">&#9888;</span>
      <div className="text-xs text-amber-200/80 leading-relaxed">
        <span className="font-semibold text-amber-300">Depeg Alert · </span>
        {depegged.map((a) => {
          const devPct = (a.price! - 1) * 100
          return (
            <span key={a.symbol}>
              <span className="font-medium">{a.symbol}</span>{' '}
              <span className="text-amber-400/80">
                ({formatPct(devPct, { decimals: 2 })})
              </span>{' '}
            </span>
          )
        })}
        trading off peg.
      </div>
    </div>
  )
}

// ── Mechanism Distribution ────────────────────────────────────────────────────

interface MechDist { fiat: number; crypto: number; algorithmic: number }

function computeMechDist(assets: StablecoinAssetMetrics[]): MechDist {
  const dist: MechDist = { fiat: 0, crypto: 0, algorithmic: 0 }
  for (const a of assets) {
    const key = a.pegMechanism?.toLowerCase() ?? ''
    if (key === 'fiat' || key === 'crypto' || key === 'algorithmic') {
      dist[key as keyof MechDist] += a.dominance
    }
  }
  return dist
}

function MechDistPills({ dist }: { dist: MechDist }) {
  const pills = [
    { label: 'Fiat',   pct: dist.fiat,        color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { label: 'Crypto', pct: dist.crypto,       color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { label: 'Algo',   pct: dist.algorithmic,  color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ].filter((p) => p.pct > 0.001)

  if (pills.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {pills.map((p) => (
        <span
          key={p.label}
          className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold leading-none ${p.color}`}
        >
          {p.label} {formatPct(p.pct * 100, { signed: false, decimals: 0 })}
        </span>
      ))}
    </div>
  )
}

// ── Concentration Risk ─────────────────────────────────────────────────────────

function computeHHI(assets: StablecoinAssetMetrics[]): number {
  return assets.reduce((sum, a) => sum + Math.pow(a.dominance, 2), 0)
}

function ConcentrationBadge({ hhi }: { hhi: number }) {
  const { label, color } =
    hhi > 0.5
      ? { label: 'Concentrated', color: 'bg-red-500/20 text-red-300 border-red-500/30' }
      : hhi > 0.25
      ? { label: 'Moderate Risk', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
      : { label: 'Diversified',   color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold leading-none ${color}`}
      title={`HHI: ${hhi.toFixed(3)}`}
    >
      {label}
    </span>
  )
}

// ── Market Health Score ───────────────────────────────────────────────────────

function computeMarketHealthScore(assets: StablecoinAssetMetrics[]): number {
  const real = assets.filter((a) => a.symbol !== 'OTHERS')
  if (real.length === 0) return 50

  // Component 1: % assets on-peg (price within 0.5%)
  const withPrice = real.filter((a) => a.price !== null)
  const onPeg = withPrice.filter((a) => Math.abs(a.price! - 1) <= DEPEG_THRESHOLD).length
  const pegScore = withPrice.length > 0 ? (onPeg / withPrice.length) * 100 : 50

  // Component 2: dominance concentration (lower HHI = healthier)
  const hhi = real.reduce((sum, a) => sum + Math.pow(a.dominance, 2), 0)
  // HHI 0..1 — monopoly = 1, perfect distribution approaches 0
  const concentrationScore = (1 - Math.min(hhi * 2, 1)) * 100

  // Component 3: fiat-backed dominance (most stable mechanism)
  const fiatDom = real
    .filter((a) => a.pegMechanism?.toLowerCase() === 'fiat')
    .reduce((sum, a) => sum + a.dominance, 0)
  const fiatScore = Math.min(fiatDom * 100, 100)

  // Weighted composite
  return Math.round(pegScore * 0.45 + concentrationScore * 0.3 + fiatScore * 0.25)
}

function MarketHealthScore({ score }: { score: number }) {
  const label = score >= 75 ? 'Healthy' : score >= 50 ? 'Moderate' : 'Stressed'
  const color =
    score >= 75
      ? 'text-emerald-400'
      : score >= 50
      ? 'text-amber-400'
      : 'text-red-400'
  const ringColor =
    score >= 75 ? '#34d399' : score >= 50 ? '#f59e0b' : '#f43f5e'

  const circumference = 2 * Math.PI * 20
  const dashOffset = circumference * (1 - score / 100)

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle
            cx="26" cy="26" r="20"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
          <circle
            cx="26" cy="26" r="20"
            fill="none"
            stroke={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 26 26)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {score}
        </span>
      </div>
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider">Market Health</p>
        <p className={`text-sm font-bold ${color}`}>{label}</p>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function StablecoinAnalysis() {
  const analytics = useDefiStore((s) => s.analytics)
  const summary = analytics?.stablecoinSummary ?? null

  const realAssets = useMemo(
    () => (summary?.topAssets ?? []).filter((a) => a.symbol !== 'OTHERS'),
    [summary]
  )

  const healthScore = useMemo(
    () => computeMarketHealthScore(summary?.topAssets ?? []),
    [summary]
  )

  const mechDist = useMemo(() => computeMechDist(realAssets), [realAssets])
  const hhi      = useMemo(() => computeHHI(realAssets), [realAssets])

  if (!summary) return null

  const chainData = summary.chainDistribution
    .filter((c) => c.totalUSD > 0)
    .slice(0, 8)

  const dominantChain = chainData[0] ?? null

  return (
    <section className="px-4 sm:px-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Stablecoin Market</h2>
        <p className="text-sm text-white/40">
          Cross-chain stablecoin supply analysis
        </p>
      </div>

      {/* Depeg alert — shown above cards if any asset is off-peg */}
      <div className="mb-4">
        <DepegAlert assets={realAssets} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Left: market cap + top assets ─────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          {/* Header row: total supply + weekly change + health score */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">
                Total Supply
              </p>
              <p className="mt-0.5 text-2xl font-black text-white">
                {formatTVL(summary.totalMarketCap)}
              </p>
              {summary.weeklyChange != null && (
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                    summary.weeklyChange >= 0
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {formatPct(summary.weeklyChange, { decimals: 1 })} 7d
                </span>
              )}
            </div>
            <MarketHealthScore score={healthScore} />
          </div>

          {/* Mechanism distribution pills + concentration risk badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <MechDistPills dist={mechDist} />
            <ConcentrationBadge hhi={hhi} />
          </div>

          {/* Top assets with peg mechanism badge + peg health */}
          <div className="space-y-3">
            {summary.topAssets.slice(0, 5).map((asset, i) => (
              <div key={asset.symbol} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium text-white/80 truncate">
                      {asset.symbol}
                    </span>
                    <PegMechanismBadge mechanism={asset.pegMechanism} />
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-white/40">
                      {formatTVL(asset.circulatingUSD)}
                    </span>
                    <span className="text-xs font-medium text-white/60 w-10 text-right">
                      {formatPct(asset.dominance * 100, { signed: false, decimals: 1 })}
                    </span>
                  </div>
                </div>

                {/* Chain count as labeled subtext */}
                {asset.chainCount > 0 && (
                  <p className="pl-4 text-[10px] text-white/30">
                    {asset.chainCount} chain{asset.chainCount !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Dominance bar */}
                <div className="h-1 w-full rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${asset.dominance * 100}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>

                {/* Peg health bar (only for real assets) */}
                {asset.symbol !== 'OTHERS' && (
                  <PegHealthBar price={asset.price} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: chain distribution donut ───────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          {/* Chain distribution header with dominant chain callout */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-white/60">
              Chain Distribution
            </p>
            {dominantChain && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-white/40 uppercase tracking-wider leading-none mb-1">
                  Dominant Chain
                </p>
                <p className="text-sm font-bold text-white leading-none">
                  {dominantChain.chain}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {formatPct(dominantChain.share * 100, { signed: false, decimals: 1 })} · {formatTVL(dominantChain.totalUSD)}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={chainData}
                    cx="50%"
                    cy="50%"
                    innerRadius={34}
                    outerRadius={56}
                    dataKey="totalUSD"
                    strokeWidth={0}
                  >
                    {chainData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        opacity={0.85}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => [formatTVL(typeof v === 'number' ? v : 0), 'Supply']}
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {chainData.slice(0, 6).map((c, i) => (
                <div key={c.chain} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length], opacity: 0.9 }}
                    />
                    <span className="text-xs text-white/60 truncate max-w-[80px]">
                      {c.chain}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-white/70">
                    {formatPct(c.share * 100, { signed: false, decimals: 1 })}
                  </span>
                </div>
              ))}
              {chainData.length > 6 && (
                <p className="pl-3.5 text-xs text-white/30">
                  +{chainData.length - 6} more
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
