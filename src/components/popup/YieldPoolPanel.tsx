'use client'

import { useEffect } from 'react'
import { useDefiStore } from '@/store/defi'
import { formatTVL, formatAPY, formatChange } from '@/lib/transforms/format'
import { apyTierColor } from '@/lib/transforms/normalizeProtocol'
import { classifyPool } from '@/lib/risk/classifyPool'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { PoolCategoryBadge } from '@/components/ui/PoolCategoryBadge'
import InvestLink from '@/components/ui/InvestLink'

// ── Helpers ───────────────────────────────────────────────────────────────────

function TierBadge({ apy }: { apy: number }) {
  const color = apyTierColor(apy)
  let label = 'Low'
  if (apy >= 100) label = 'Ultra High'
  else if (apy >= 50) label = 'Very High'
  else if (apy >= 20) label = 'High'
  else if (apy >= 10) label = 'Medium'
  else if (apy >= 5) label = 'Moderate'

  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  )
}

interface StatBoxProps {
  label: string
  value: string
  accent?: string
}

function StatBox({ label, value, accent }: StatBoxProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p
        className="mt-0.5 text-base font-bold"
        style={{ color: accent ?? '#f8fafc' }}
      >
        {value}
      </p>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function YieldPoolPanel() {
  const { selectedPool, setSelectedPool } = useDefiStore()

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPool(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelectedPool])

  if (!selectedPool) return null

  const apy = selectedPool.apy ?? 0
  const accentColor = apyTierColor(apy)
  const change1d = formatChange(selectedPool.apyPct1D)
  const change7d = formatChange(selectedPool.apyPct7D)

  // Classify this pool for risk + category badges.
  // YieldNode is a graph/visualization node; adapt it to the YieldPool shape classifyPool expects.
  // YieldNode doesn't carry ilRisk / exposure / stablecoin — default to safe unknowns so
  // classification falls through to 'medium' rather than falsely claiming 'low'.
  const classified = classifyPool({
    chain: selectedPool.primaryChain,
    project: selectedPool.name,
    symbol: selectedPool.poolSymbol,
    tvlUsd: selectedPool.tvlUsd,
    apyBase: selectedPool.apyBase,
    apyReward: selectedPool.apyReward,
    apy,
    apyPct1D: selectedPool.apyPct1D,
    apyPct7D: selectedPool.apyPct7D,
    pool: selectedPool.poolId,
    underlyingTokens: [],
    rewardTokens: null,
    ilRisk: 'no',
    exposure: 'single',
    stablecoin: false,
  })

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div
        className="flex items-start justify-between border-b p-6"
        style={{ borderBottomColor: `${accentColor}44` }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white">
              {selectedPool.poolSymbol}
            </h2>
            <TierBadge apy={apy} />
          </div>
          <p className="text-sm text-white/50">
            {selectedPool.name} · {selectedPool.primaryChain}
          </p>
          {/* Risk + category badges */}
          <div className="mt-2 flex items-center gap-2">
            <RiskBadge risk={classified.riskLevel} />
            <PoolCategoryBadge category={classified.category} />
          </div>
        </div>
        <button
          onClick={() => setSelectedPool(null)}
          className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-6 p-6">
        {/* Hero APY */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{
            background: `radial-gradient(ellipse at center, ${accentColor}18 0%, transparent 70%)`,
            border: `1px solid ${accentColor}33`,
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
            Annual Percentage Yield
          </p>
          <p
            className="text-5xl font-black tabular-nums"
            style={{ color: accentColor }}
          >
            {formatAPY(apy)}
          </p>
          {selectedPool.apyBase != null && selectedPool.apyReward != null && (
            <div className="mt-2 flex justify-center gap-4 text-xs text-white/40">
              <span>
                Base:{' '}
                <span className="text-white/70">
                  {formatAPY(selectedPool.apyBase)}
                </span>
              </span>
              <span>
                Reward:{' '}
                <span className="text-white/70">
                  {formatAPY(selectedPool.apyReward)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Total Value Locked"
            value={formatTVL(selectedPool.tvlUsd)}
          />
          <StatBox
            label="Chain"
            value={selectedPool.primaryChain}
          />
          <StatBox
            label="APY 1d Change"
            value={change1d.text}
            accent={change1d.positive ? '#34d399' : '#f87171'}
          />
          <StatBox
            label="APY 7d Change"
            value={change7d.text}
            accent={change7d.positive ? '#34d399' : '#f87171'}
          />
        </div>

        {/* Pool details */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
            Pool Details
          </h3>

          <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-white/50">Protocol</span>
              <span className="text-sm font-medium text-white capitalize">
                {selectedPool.name}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-white/50">Pool Symbol</span>
              <span className="text-sm font-medium text-white">
                {selectedPool.poolSymbol}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-white/50">Risk Level</span>
              <RiskBadge risk={classified.riskLevel} compact />
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-white/50">Category</span>
              <PoolCategoryBadge category={classified.category} />
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-white/50">Pool ID</span>
              <span className="text-xs font-mono text-white/40 truncate max-w-[180px]">
                {selectedPool.poolId}
              </span>
            </div>
          </div>
        </div>

        {/* Where to Invest */}
        <InvestLink
          poolId={selectedPool.poolId}
          protocolSlug={selectedPool.slug}
        />

        {/* APY breakdown bar */}
        {selectedPool.apyBase != null &&
          selectedPool.apyReward != null &&
          apy > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                APY Composition
              </h3>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                {/* Base APY bar */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-white/50">Base APY</span>
                    <span className="text-xs font-semibold text-cyan-400">
                      {formatAPY(selectedPool.apyBase)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${Math.min((selectedPool.apyBase / apy) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {/* Reward APY bar */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-white/50">Reward APY</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {formatAPY(selectedPool.apyReward)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.min((selectedPool.apyReward / apy) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Data source note */}
        <p className="text-center text-xs text-white/20 pb-2">
          Data sourced from DeFiLlama Yields API
        </p>
      </div>
    </div>
  )
}
