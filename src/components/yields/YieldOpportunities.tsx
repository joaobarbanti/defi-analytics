'use client'

import { useState, useMemo } from 'react'
import { useYields } from '@/hooks/useYields'
import { classifyPool } from '@/lib/risk/classifyPool'
import { formatTVL, formatAPY } from '@/lib/transforms/format'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { PoolCategoryBadge } from '@/components/ui/PoolCategoryBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { RISK_COLOR, CATEGORY_LABEL } from '@/types/risk'
import type { RiskLevel, PoolCategory, ClassifiedPool } from '@/types/risk'

// ── Risk tab definitions ──────────────────────────────────────────────────────

const RISK_TABS: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'low',    label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high',   label: 'High Risk' },
]

const CATEGORIES: { value: PoolCategory | 'all'; label: string }[] = [
  { value: 'all',             label: 'All Categories' },
  { value: 'stablecoin-lp',   label: CATEGORY_LABEL['stablecoin-lp'] },
  { value: 'borrow',          label: CATEGORY_LABEL['borrow'] },
  { value: 'single-asset',    label: CATEGORY_LABEL['single-asset'] },
  { value: 'liquid-staking',  label: CATEGORY_LABEL['liquid-staking'] },
  { value: 'yield-aggregator',label: CATEGORY_LABEL['yield-aggregator'] },
  { value: 'volatile-lp',     label: CATEGORY_LABEL['volatile-lp'] },
  { value: 'leveraged',       label: CATEGORY_LABEL['leveraged'] },
]

// ── Protocol accordion row ────────────────────────────────────────────────────

function ProtocolGroup({
  project,
  pools,
}: {
  project: string
  pools: ClassifiedPool[]
}) {
  const [open, setOpen] = useState(false)

  // Risk distribution counts for this protocol
  const lowCount = pools.filter((p) => p.riskLevel === 'low').length
  const medCount = pools.filter((p) => p.riskLevel === 'medium').length
  const highCount = pools.filter((p) => p.riskLevel === 'high').length

  // Best APY within the group
  const bestAPY = Math.max(...pools.map((p) => p.apy))
  const totalTVL = pools.reduce((s, p) => s + (p.tvlUsd ?? 0), 0)

  return (
    <div className="border-b border-white/5 last:border-0">
      {/* Protocol header row */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Expand icon */}
        <span className="text-white/30 w-4 text-center select-none">
          {open ? '▾' : '▸'}
        </span>

        {/* Protocol name */}
        <span className="flex-1 text-sm font-semibold text-white capitalize">
          {project}
        </span>

        {/* Pool count */}
        <span className="text-xs text-white/30 mr-3">
          {pools.length} pool{pools.length !== 1 ? 's' : ''}
        </span>

        {/* Risk distribution pills */}
        <span className="hidden sm:flex items-center gap-1 mr-3">
          {lowCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${RISK_COLOR.low}22`, color: RISK_COLOR.low }}
            >
              {lowCount}L
            </span>
          )}
          {medCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${RISK_COLOR.medium}22`, color: RISK_COLOR.medium }}
            >
              {medCount}M
            </span>
          )}
          {highCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${RISK_COLOR.high}22`, color: RISK_COLOR.high }}
            >
              {highCount}H
            </span>
          )}
        </span>

        {/* Best APY */}
        <span className="w-20 text-right text-sm font-bold text-emerald-400">
          {formatAPY(bestAPY)}
        </span>

        {/* Total TVL */}
        <span className="w-24 text-right text-xs text-white/40">
          {formatTVL(totalTVL)}
        </span>
      </button>

      {/* Expanded pool rows */}
      {open && (
        <div className="pl-8 pb-1">
          <table className="w-full">
            <tbody className="divide-y divide-white/5">
              {pools.map((pool, i) => {
                const apyBase = pool.apyBase ?? 0
                const apyReward = pool.apyReward ?? 0

                return (
                  <tr
                    key={`${pool.pool}-${i}`}
                    className="transition-colors hover:bg-white/5"
                  >
                    {/* Pool symbol + category */}
                    <td className="py-2.5 pr-3 pl-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-white/80 font-medium">
                          {pool.symbol.slice(0, 24)}
                        </span>
                        <PoolCategoryBadge category={pool.category} />
                      </div>
                    </td>

                    {/* Chain */}
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50">
                        {pool.chain}
                      </span>
                    </td>

                    {/* Risk */}
                    <td className="py-2.5 px-3">
                      <RiskBadge risk={pool.riskLevel} compact />
                    </td>

                    {/* APY decomposition */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm font-bold text-emerald-400">
                          {formatAPY(pool.apy)}
                        </span>
                        {(apyBase > 0 || apyReward > 0) && (
                          <span className="text-xs text-white/30">
                            {apyBase > 0 && `${apyBase.toFixed(1)}% base`}
                            {apyBase > 0 && apyReward > 0 && ' + '}
                            {apyReward > 0 && (
                              <span className="text-amber-400/60">
                                {apyReward.toFixed(1)}% rewards
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* TVL */}
                    <td className="py-2.5 pl-3 text-right text-sm text-white/40">
                      {formatTVL(pool.tvlUsd)}
                    </td>

                    {/* DeFiLlama link */}
                    <td className="py-2.5 pl-2 pr-3 text-center">
                      <a
                        href={`https://defillama.com/yields/pool/${pool.pool}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on DeFiLlama"
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-cyan-500 hover:text-cyan-300 hover:bg-cyan-950/50 transition-colors text-xs leading-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function YieldOpportunities() {
  const { pools, isLoading } = useYields()

  const [riskTab, setRiskTab] = useState<RiskLevel | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<PoolCategory | 'all'>('all')
  const [showAll, setShowAll] = useState(false)

  // Classify all pools once
  const classifiedPools = useMemo(() => {
    return pools
      .filter((p) => p.apy > 0 && p.tvlUsd > 10_000 && p.apy < 1000)
      .map(classifyPool)
  }, [pools])

  // Apply risk + category filters
  const filtered = useMemo(() => {
    return classifiedPools
      .filter((p) => riskTab === 'all' || p.riskLevel === riskTab)
      .filter((p) => categoryFilter === 'all' || p.category === categoryFilter)
      .sort((a, b) => b.apy - a.apy)
  }, [classifiedPools, riskTab, categoryFilter])

  // Group by protocol
  const grouped = useMemo(() => {
    const map = new Map<string, ClassifiedPool[]>()
    for (const pool of filtered) {
      const key = pool.project
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(pool)
    }
    // Sort groups by best APY within each group
    return Array.from(map.entries())
      .map(([project, pools]) => ({
        project,
        pools: pools.sort((a, b) => b.apy - a.apy),
        bestAPY: Math.max(...pools.map((p) => p.apy)),
      }))
      .sort((a, b) => b.bestAPY - a.bestAPY)
  }, [filtered])

  const visibleGroups = showAll ? grouped : grouped.slice(0, 15)

  // Summary counts
  const lowCount = classifiedPools.filter((p) => p.riskLevel === 'low').length
  const medCount = classifiedPools.filter((p) => p.riskLevel === 'medium').length
  const highCount = classifiedPools.filter((p) => p.riskLevel === 'high').length

  return (
    <section className="px-4 sm:px-8">
      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Yield Opportunities</h2>
            <p className="text-sm text-white/40">
              {filtered.length.toLocaleString()} pools from {grouped.length} protocols
            </p>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as PoolCategory | 'all')}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white/80 outline-none focus:border-blue-500 mt-2 sm:mt-0"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Risk tabs */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {RISK_TABS.map((tab) => {
            const isActive = riskTab === tab.value
            const color =
              tab.value === 'low'    ? RISK_COLOR.low    :
              tab.value === 'medium' ? RISK_COLOR.medium :
              tab.value === 'high'   ? RISK_COLOR.high   :
              '#94a3b8'

            const count =
              tab.value === 'low'    ? lowCount  :
              tab.value === 'medium' ? medCount  :
              tab.value === 'high'   ? highCount :
              classifiedPools.length

            return (
              <button
                key={tab.value}
                onClick={() => setRiskTab(tab.value)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all"
                style={
                  isActive
                    ? { backgroundColor: `${color}22`, color, border: `1px solid ${color}66` }
                    : { backgroundColor: 'transparent', color: '#ffffff55', border: '1px solid #ffffff15' }
                }
              >
                {tab.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs"
                  style={
                    isActive
                      ? { backgroundColor: `${color}33` }
                      : { backgroundColor: '#ffffff11' }
                  }
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : pools.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/40">
            Yield data unavailable (API may require authentication)
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/40">No pools match the selected filters</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="overflow-hidden rounded-xl border border-white/10">
            {/* Column labels */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] border-b border-white/10 bg-white/5 px-4 py-2">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40 pl-7">
                Protocol / Pool
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-white/40 w-20 text-center">
                Chain
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-white/40 w-28 text-center">
                Risk
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-white/40 w-24 text-right">
                APY
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-white/40 w-24 text-right">
                TVL
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-white/40 w-10 text-center">
                Link
              </span>
            </div>

            {/* Protocol groups */}
            {visibleGroups.map(({ project, pools }) => (
              <ProtocolGroup key={project} project={project} pools={pools} />
            ))}
          </div>

          {/* Load more */}
          {!showAll && grouped.length > 15 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(true)}
                className="rounded-lg border border-white/10 bg-white/5 px-6 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                Show all {grouped.length} protocols
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
