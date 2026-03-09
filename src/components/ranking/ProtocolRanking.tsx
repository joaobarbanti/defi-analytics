'use client'

import { useState, useMemo } from 'react'
import { useProtocols } from '@/hooks/useProtocols'
import { useDefiStore } from '@/store/defi'
import { assignNodeColor, normalizeProtocol } from '@/lib/transforms/normalizeProtocol'
import { formatTVL, formatChange } from '@/lib/transforms/format'
import { Badge } from '@/components/ui/Badge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { TrendLabelBadge } from '@/components/ui/TrendLabelBadge'
import { MomentumArrow } from '@/components/ui/MomentumArrow'
import { RISK_COLOR } from '@/types/risk'
import type { RiskLevel } from '@/types/risk'
import type { Protocol } from '@/types/defillama'

// ── Protocol category → risk level mapping ────────────────────────────────────
//
// Based on structural risk profile of each DeFiLlama protocol category:
//   low    → stablecoins, RWA, simple lending blue-chips, oracle infrastructure
//   medium → DEXes, liquid staking, CDPs, yield aggregators, insurance
//   high   → leveraged, derivatives, algo-stables, gaming, synthetics

const CATEGORY_RISK_MAP: Record<string, RiskLevel> = {
  // Low
  'Stablecoins':        'low',
  'RWA':                'low',
  'Payments':           'low',
  'Oracle':             'low',
  // Medium
  'Lending':            'medium',
  'Dexes':              'medium',
  'Liquid Staking':     'medium',
  'Staking':            'medium',
  'Yield':              'medium',
  'Yield Aggregator':   'medium',
  'CDP':                'medium',
  'Bridge':             'medium',
  'Cross Chain':        'medium',
  'Insurance':          'medium',
  'Reserve Currency':   'medium',
  // High
  'Derivatives':        'high',
  'Leveraged Farming':  'high',
  'Algo-Stables':       'high',
  'Options':            'high',
  'Synthetics':         'high',
  'NFT':                'high',
  'Gaming':             'high',
}

function getProtocolRisk(category: string): RiskLevel {
  return CATEGORY_RISK_MAP[category] ?? 'medium'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type SortKey = 'tvl' | 'change_1d' | 'change_7d' | 'name' | 'momentum'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 opacity-20">↕</span>
  return <span className="ml-1">{dir === 'desc' ? '↓' : '↑'}</span>
}

const RISK_TABS: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'low',    label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high',   label: 'High Risk' },
]

// ── Main component ────────────────────────────────────────────────────────────

export function ProtocolRanking() {
  const { protocols, isLoading } = useProtocols()
  const { setSelectedProtocol, filters, setFilter, resetFilters, growthMetrics } =
    useDefiStore()

  const metrics = growthMetrics()

  const [sortKey, setSortKey] = useState<SortKey>('tvl')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')

  const categories = useMemo(() => {
    const set = new Set(protocols.map((p) => p.category).filter(Boolean))
    return Array.from(set).sort()
  }, [protocols])

  const chains = useMemo(() => {
    const set = new Set(protocols.flatMap((p) => p.chains ?? []))
    return Array.from(set).sort()
  }, [protocols])

  // Risk counts
  const riskCounts = useMemo(() => {
    const base = protocols.filter((p) => p.tvl && p.tvl > 0)
    return {
      all: base.length,
      low:    base.filter((p) => getProtocolRisk(p.category) === 'low').length,
      medium: base.filter((p) => getProtocolRisk(p.category) === 'medium').length,
      high:   base.filter((p) => getProtocolRisk(p.category) === 'high').length,
    }
  }, [protocols])

  const sorted = useMemo(() => {
    let list = protocols.filter((p) => p.tvl && p.tvl > 0)

    // Zustand filters
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.symbol?.toLowerCase().includes(q)
      )
    }
    if (filters.category) {
      list = list.filter((p) => p.category === filters.category)
    }
    if (filters.chain) {
      list = list.filter((p) => p.chains?.includes(filters.chain!))
    }
    if (filters.minTVL > 0) {
      list = list.filter((p) => (p.tvl ?? 0) >= filters.minTVL)
    }

    // Risk tab filter
    if (riskFilter !== 'all') {
      list = list.filter((p) => getProtocolRisk(p.category) === riskFilter)
    }

    // Sort
    list = [...list].sort((a, b) => {
      let valA: number | string = 0
      let valB: number | string = 0
      if (sortKey === 'tvl') {
        valA = a.tvl ?? 0
        valB = b.tvl ?? 0
      } else if (sortKey === 'change_1d') {
        valA = a.change_1d ?? -Infinity
        valB = b.change_1d ?? -Infinity
      } else if (sortKey === 'change_7d') {
        valA = a.change_7d ?? -Infinity
        valB = b.change_7d ?? -Infinity
      } else if (sortKey === 'name') {
        valA = a.name ?? ''
        valB = b.name ?? ''
      } else if (sortKey === 'momentum') {
        valA = metrics[a.slug]?.momentumScore ?? 0
        valB = metrics[b.slug]?.momentumScore ?? 0
      }

      if (typeof valA === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA)
      }
      return sortDir === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number)
    })

    return list.slice(0, 200)
  }, [protocols, filters, sortKey, sortDir, riskFilter, metrics])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function handleRowClick(p: Protocol) {
    const node = normalizeProtocol(p)
    setSelectedProtocol(node)
  }

  const hasAnalytics = Object.keys(metrics).length > 0

  return (
    <section className="px-4 sm:px-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Protocol Rankings</h2>
          <p className="text-sm text-white/40">
            {sorted.length.toLocaleString()} protocols shown
            {hasAnalytics && (
              <span className="ml-2 text-blue-400/70">· with market intelligence</span>
            )}
          </p>
        </div>
        <button
          onClick={() => { resetFilters(); setRiskFilter('all') }}
          className="text-xs text-white/30 transition hover:text-white/60"
        >
          Reset filters
        </button>
      </div>

      {/* Risk tabs */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {RISK_TABS.map((tab) => {
          const isActive = riskFilter === tab.value
          const color =
            tab.value === 'low'    ? RISK_COLOR.low    :
            tab.value === 'medium' ? RISK_COLOR.medium :
            tab.value === 'high'   ? RISK_COLOR.high   :
            '#94a3b8'
          const count = riskCounts[tab.value]

          return (
            <button
              key={tab.value}
              onClick={() => setRiskFilter(tab.value)}
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
                style={isActive ? { backgroundColor: `${color}33` } : { backgroundColor: '#ffffff11' }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + chain + category + TVL filters */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Search protocol…"
          value={filters.searchQuery}
          onChange={(e) => setFilter('searchQuery', e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-blue-500 col-span-2 sm:col-span-1"
        />
        <select
          value={filters.chain ?? ''}
          onChange={(e) => setFilter('chain', e.target.value || null)}
          className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white/80 outline-none focus:border-blue-500"
        >
          <option value="">All Chains</option>
          {chains.slice(0, 40).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.category ?? ''}
          onChange={(e) => setFilter('category', e.target.value || null)}
          className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white/80 outline-none focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.minTVL}
          onChange={(e) => setFilter('minTVL', Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white/80 outline-none focus:border-blue-500"
        >
          <option value={0}>Any TVL</option>
          <option value={1_000_000}>$1M+</option>
          <option value={10_000_000}>$10M+</option>
          <option value={100_000_000}>$100M+</option>
          <option value={1_000_000_000}>$1B+</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 w-10">
                    #
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/70 select-none"
                    onClick={() => handleSort('name')}
                  >
                    Protocol
                    <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                    Chain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                    Risk
                  </th>
                  {hasAnalytics && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                      Trend
                    </th>
                  )}
                  {hasAnalytics && (
                    <th
                      className="cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/70 select-none"
                      onClick={() => handleSort('momentum')}
                    >
                      Momentum
                      <SortIcon active={sortKey === 'momentum'} dir={sortDir} />
                    </th>
                  )}
                  <th
                    className="cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/70 select-none"
                    onClick={() => handleSort('tvl')}
                  >
                    TVL
                    <SortIcon active={sortKey === 'tvl'} dir={sortDir} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/70 select-none"
                    onClick={() => handleSort('change_1d')}
                  >
                    1d %
                    <SortIcon active={sortKey === 'change_1d'} dir={sortDir} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/70 select-none"
                    onClick={() => handleSort('change_7d')}
                  >
                    7d %
                    <SortIcon active={sortKey === 'change_7d'} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sorted.map((p, i) => {
                  const color = assignNodeColor(p.category)
                  const c1d = formatChange(p.change_1d)
                  const c7d = formatChange(p.change_7d)
                  const risk = getProtocolRisk(p.category)
                  const pMetrics = metrics[p.slug]

                  return (
                    <tr
                      key={p.id ?? p.slug ?? i}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      onClick={() => handleRowClick(p)}
                    >
                      <td className="px-4 py-3 text-sm text-white/30">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.logo}
                              alt={p.name}
                              className="h-6 w-6 rounded-full object-contain"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div
                              className="h-6 w-6 rounded-full"
                              style={{ backgroundColor: `${color}33` }}
                            />
                          )}
                          <span className="text-sm font-medium text-white">
                            {p.name}
                          </span>
                          {p.symbol && (
                            <span className="text-xs text-white/30">
                              {p.symbol}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-white/50">
                          {p.chains?.[0] ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={color}>{p.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge risk={risk} compact />
                      </td>
                      {hasAnalytics && (
                        <td className="px-4 py-3">
                          {pMetrics ? (
                            <TrendLabelBadge label={pMetrics.trendLabel} compact />
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </td>
                      )}
                      {hasAnalytics && (
                        <td className="px-4 py-3 text-right">
                          {pMetrics ? (
                            <MomentumArrow
                              score={pMetrics.momentumScore}
                              rankChange={pMetrics.rankChange}
                            />
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-sm font-medium text-white">
                        {formatTVL(p.tvl)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-medium ${
                            c1d.positive ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {c1d.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-medium ${
                            c7d.positive ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {c7d.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
