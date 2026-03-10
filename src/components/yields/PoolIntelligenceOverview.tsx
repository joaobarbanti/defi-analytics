'use client'

import { useMemo, useState } from 'react'
import { computePoolIntelligence } from '@/lib/risk/poolIndicators'
import type { ClassifiedPool, InvestorProfileType, PoolIndicator } from '@/types/risk'
import { formatTVL, formatAPY, formatPct } from '@/lib/transforms/format'
import { useDefiStore } from '@/store/defi'

// ─── Flag explanation copy ────────────────────────────────────────────────────

const FLAG_EXPLANATIONS: Record<string, string> = {
  reward_driven: '81%+ of APY comes from reward tokens — yield collapses if incentives end',
  low_tvl:       'TVL below $500k — thin liquidity, high slippage, exit risk',
  extreme_apy:   'APY exceeds 200% — unsustainable, likely incentive inflation',
  apy_crash:     'APY dropped >50% in 7 days — protocol or incentive destabilization',
}

const SUSPICIOUS_FLAGS = ['reward_driven', 'low_tvl', 'extreme_apy', 'apy_crash'] as const

// ─── Profile tab config ───────────────────────────────────────────────────────

const PROFILE_CONFIG: Record<InvestorProfileType, {
  label: string
  subtitle: string
  accentClass: string
  ringClass: string
  badgeClass: string
  iconPath: string
}> = {
  conservative: {
    label: 'Conservative',
    subtitle: 'Stablecoin LPs · $5M+ TVL · 2–25% APY',
    accentClass: 'text-emerald-400',
    ringClass: 'stroke-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    iconPath: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  moderate: {
    label: 'Moderate',
    subtitle: 'LST · Incentivised · $2M+ TVL',
    accentClass: 'text-blue-400',
    ringClass: 'stroke-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    iconPath: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  },
  aggressive: {
    label: 'Aggressive',
    subtitle: 'High-APY · 25–200% · Active management',
    accentClass: 'text-orange-400',
    ringClass: 'stroke-orange-500',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    iconPath: 'M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z',
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceRing({ score, ringClass }: { score: number; ringClass: string }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        {/* track */}
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        {/* progress */}
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`transition-all duration-700 ${ringClass}`}
        />
      </svg>
      <span className="absolute text-xs font-bold text-white">{score}</span>
    </div>
  )
}

function StatPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 min-w-[72px]">
      <span className={`text-sm font-bold ${accent}`}>{value}</span>
      <span className="mt-0.5 text-[10px] text-white/40">{label}</span>
    </div>
  )
}

function PoolRow({ pool, accent }: { pool: PoolIndicator; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-white">{pool.symbol}</p>
        <p className="truncate text-[11px] text-white/40">{pool.project} · {pool.chain}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${accent}`}>{formatAPY(pool.apy)}</p>
        <p className="text-[11px] text-white/40">{formatTVL(pool.tvlUsd)}</p>
      </div>
    </div>
  )
}

function FlagBadge({ flag }: { flag: string }) {
  const colors: Record<string, string> = {
    reward_driven: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low_tvl:       'bg-red-500/10 text-red-400 border-red-500/20',
    extreme_apy:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
    apy_crash:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }
  const labels: Record<string, string> = {
    reward_driven: 'Reward Driven',
    low_tvl:       'Low TVL',
    extreme_apy:   'Extreme APY',
    apy_crash:     'APY Crash',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${colors[flag] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
      {labels[flag] ?? flag}
    </span>
  )
}

// ─── Suspicious pools panel ───────────────────────────────────────────────────

function SuspiciousPoolsPanel({ indicators }: { indicators: PoolIndicator[] }) {
  const [expanded, setExpanded] = useState(false)

  const suspicious = useMemo(
    () =>
      indicators.filter(
        (p) => SUSPICIOUS_FLAGS.filter((f) => p.flags.includes(f)).length >= 2
      ),
    [indicators]
  )

  if (suspicious.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-sm text-emerald-400 font-medium">No suspicious pools detected across the universe</p>
        <p className="mt-0.5 text-xs text-white/40">All flagged pools carry fewer than 2 risk signals</p>
      </div>
    )
  }

  const displayed = expanded ? suspicious : suspicious.slice(0, 3)

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-red-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Warning icon */}
          <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-sm font-semibold text-red-400">
            {suspicious.length} Suspicious Pool{suspicious.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-white/30">· 2+ risk flags each</span>
        </div>
        {suspicious.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-white/40 transition hover:text-white/70"
          >
            {expanded ? 'Show less' : `Show all ${suspicious.length}`}
          </button>
        )}
      </div>

      {/* Pool rows */}
      <div className="divide-y divide-white/5">
        {displayed.map((pool) => {
          const activeFlags = SUSPICIOUS_FLAGS.filter((f) => pool.flags.includes(f))
          return (
            <div key={pool.poolId} className="px-4 py-3">
              {/* Pool identity row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{pool.symbol}</p>
                  <p className="text-[11px] text-white/40">{pool.project} · {pool.chain}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-red-400">{formatAPY(pool.apy)}</p>
                  <p className="text-[11px] text-white/40">{formatTVL(pool.tvlUsd)}</p>
                </div>
              </div>
              {/* Flag badges */}
              <div className="mt-2 flex flex-wrap gap-1">
                {activeFlags.map((f) => (
                  <FlagBadge key={f} flag={f} />
                ))}
              </div>
              {/* Flag explanations */}
              <ul className="mt-2 space-y-0.5">
                {activeFlags.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/50">
                    <span className="mt-0.5 shrink-0 text-red-500/60">›</span>
                    <span>{FLAG_EXPLANATIONS[f]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  classifiedPools: ClassifiedPool[]
}

export function PoolIntelligenceOverview({ classifiedPools }: Props) {
  const [activeTab, setActiveTab] = useState<InvestorProfileType>('conservative')

  const setProfileFilter = useDefiStore((s) => s.setProfileFilter)

  const report = useMemo(
    () => computePoolIntelligence(classifiedPools),
    [classifiedPools]
  )

  const profile = report.profiles[activeTab]
  const config  = PROFILE_CONFIG[activeTab]

  // Derive the count of pools that would appear in YieldOpportunities for this profile
  // conservative → riskLevel 'low', moderate → 'medium', aggressive → 'high'
  const PROFILE_TO_RISK: Record<InvestorProfileType, string> = {
    conservative: 'low',
    moderate:     'medium',
    aggressive:   'high',
  }
  const viewAllCount = useMemo(() => {
    const risk = PROFILE_TO_RISK[activeTab]
    return classifiedPools.filter((p) => p.riskLevel === risk).length
  }, [classifiedPools, activeTab])

  function handleViewAll() {
    setProfileFilter(activeTab)
    document.getElementById('yield-opportunities')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Derive full indicator list for the suspicious panel
  const allIndicators = useMemo(() => {
    return classifiedPools.map((pool) => {
      const flags: string[] = []
      const rewardRatio = pool.apy > 0 && pool.apyReward != null ? pool.apyReward / pool.apy : 0
      if (pool.riskLevel === 'low' && pool.stablecoin && pool.tvlUsd >= 5_000_000 && pool.apy >= 2 && pool.apy <= 25 && pool.ilRisk !== 'yes') flags.push('stable_safe')
      if (rewardRatio > 0.8) flags.push('reward_driven')
      if (pool.tvlUsd < 500_000) flags.push('low_tvl')
      if (pool.apy > 200) flags.push('extreme_apy')
      if (pool.apyPct7D != null && pool.apyPct7D < -50) flags.push('apy_crash')
      if (pool.apyReward != null && pool.apyReward > 5 && pool.tvlUsd >= 2_000_000 && pool.riskLevel !== 'high') flags.push('transient')
      if (pool.category === 'liquid-staking') flags.push('lst')
      return {
        poolId: pool.pool,
        symbol: pool.symbol,
        project: pool.project,
        chain: pool.chain,
        flags: flags as PoolIndicator['flags'],
        apy: pool.apy,
        tvlUsd: pool.tvlUsd,
      } satisfies PoolIndicator
    })
  }, [classifiedPools])

  // Loading / empty state
  if (classifiedPools.length === 0) {
    return (
      <section className="px-4 sm:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-2 h-5 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-72 animate-pulse rounded bg-white/5" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0,1,2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 sm:px-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">

        {/* Section header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Pool Intelligence</h2>
            <p className="mt-0.5 text-sm text-white/40">
              {report.totalAnalyzed.toLocaleString()} pools analysed ·{' '}
              {report.stableSafeCount} safe · {report.suspiciousCount} suspicious
            </p>
          </div>
          {/* Universe composition pills */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400">
              {formatPct(report.pctSafe * 100, { signed: false, decimals: 0 })} safe
            </span>
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[11px] text-red-400">
              {formatPct(report.pctSuspicious * 100, { signed: false, decimals: 0 })} suspicious
            </span>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] text-indigo-400">
              {formatPct(report.pctLst * 100, { signed: false, decimals: 0 })} LST
            </span>
          </div>
        </div>

        {/* Profile tabs */}
        <div className="mb-5 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {(Object.keys(PROFILE_CONFIG) as InvestorProfileType[]).map((tab) => {
            const cfg = PROFILE_CONFIG[tab]
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <span className={isActive ? cfg.accentClass : ''}>{cfg.label}</span>
              </button>
            )
          })}
        </div>

        {/* Profile content */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Left — summary + reasons */}
          <div className="space-y-4">
            {/* Stats row */}
            <div className="flex items-center gap-3 flex-wrap">
              <ConfidenceRing score={profile.confidenceScore} ringClass={config.ringClass} />
              <StatPill label="Pools" value={profile.poolCount.toString()} accent={config.accentClass} />
              <StatPill label="Avg APY" value={formatAPY(profile.avgApy)} accent={config.accentClass} />
              <StatPill label="Total TVL" value={formatTVL(profile.totalTvl)} accent={config.accentClass} />
              <div className="flex flex-col">
                <span className="text-xs text-white/30">Confidence</span>
                <span className={`text-xs font-semibold ${config.accentClass}`}>
                  {profile.confidenceScore < 60 ? 'Low' : profile.confidenceScore < 80 ? 'Medium' : 'High'}
                </span>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-xs text-white/30">{config.subtitle}</p>

            {/* Reasons */}
            {profile.reasons.length > 0 ? (
              <ul className="space-y-1.5">
                {profile.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <svg className={`mt-0.5 h-4 w-4 shrink-0 ${config.accentClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={config.iconPath} />
                    </svg>
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/30 italic">No qualifying pools for this profile currently.</p>
            )}

            {/* Risk warnings */}
            {profile.riskWarnings.length > 0 && (
              <div className="space-y-1">
                {profile.riskWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <span className="text-xs text-amber-300/80">{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — top pools + view all button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Top Pools — {config.label}
              </p>
              {viewAllCount > 0 && (
                <button
                  onClick={handleViewAll}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all hover:opacity-80 ${config.badgeClass}`}
                >
                  View all {viewAllCount} pools
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              )}
            </div>
            {profile.topPools.length > 0 ? (
              <div className="space-y-1.5">
                {profile.topPools.map((pool) => (
                  <PoolRow key={pool.poolId} pool={pool} accent={config.accentClass} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                <p className="text-sm text-white/30">No qualifying pools</p>
                <p className="mt-1 text-xs text-white/20">Market conditions currently do not meet this profile's criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* Suspicious pools panel — always visible below the profile grid */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">
            Suspicious Pools
          </p>
          <SuspiciousPoolsPanel indicators={allIndicators} />
        </div>

        {/* Footer timestamp */}
        <p className="mt-4 text-[10px] text-white/20">
          Analysis generated at {new Date(report.generatedAt).toLocaleTimeString()} · {report.totalAnalyzed.toLocaleString()} pools in universe
        </p>
      </div>
    </section>
  )
}
