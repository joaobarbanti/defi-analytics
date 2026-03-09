'use client'

import { useState, useMemo } from 'react'
import { useDefiStore } from '@/store/defi'
import { useChains } from '@/hooks/useChains'
import { formatTVL } from '@/lib/transforms/format'
import { ChainTVLChart } from '@/components/ui/ChainTVLChart'
import type { ClassifiedPool } from '@/types/risk'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAGNITUDE_COLOR = {
  large:  { dot: 'bg-emerald-400', bar: '#10b981', label: 'text-emerald-300', accent: '#10b981' },
  medium: { dot: 'bg-blue-400',    bar: '#60a5fa', label: 'text-blue-300',    accent: '#60a5fa' },
  small:  { dot: 'bg-slate-400',   bar: '#94a3b8', label: 'text-slate-300',   accent: '#94a3b8' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  classifiedPools?: ClassifiedPool[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LiquidityFlowPanel({ classifiedPools = [] }: Props) {
  const analytics = useDefiStore((s) => s.analytics)
  const flows = analytics?.flows ?? []
  const { chains } = useChains()

  // Track which row is expanded (by flow.id); null = none
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Pool count per chain — derived from classifiedPools
  const poolCountByChain = useMemo(() => {
    const map = new Map<string, number>()
    for (const pool of classifiedPools) {
      map.set(pool.chain, (map.get(pool.chain) ?? 0) + 1)
    }
    return map
  }, [classifiedPools])

  // Chain TVL lookup by name
  const chainTvlMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of chains) {
      map.set(c.name, c.tvl)
    }
    return map
  }, [chains])

  // Proper empty state — shown when analytics loaded but no meaningful flows detected.
  if (!flows.length) {
    return (
      <section className="px-4 sm:px-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Liquidity Flows</h2>
          <p className="text-sm text-white/40">
            Estimated 7-day net capital movement · click a row for 30d chain TVL
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-10 text-center">
          <p className="text-sm text-white/30">No significant liquidity flows detected</p>
          <p className="text-xs text-white/20 mt-1">
            Flows appear when chains show meaningful 7-day TVL divergence above the 0.1% threshold
          </p>
        </div>
      </section>
    )
  }

  // Show top 8 by absolute net flow
  const topFlows = [...flows]
    .sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow))
    .slice(0, 8)

  const maxAbs = Math.max(...topFlows.map((f) => Math.abs(f.netFlow)), 1)

  return (
    <section className="px-4 sm:px-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Liquidity Flows</h2>
        <p className="text-sm text-white/40">
          Estimated 7-day net capital movement · click a row for 30d chain TVL
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="divide-y divide-white/5">
          {topFlows.map((flow) => {
            const isInflow = flow.netFlow >= 0
            const cfg = MAGNITUDE_COLOR[flow.magnitude]
            const barPct = (Math.abs(flow.netFlow) / maxAbs) * 100
            const isExpanded = expandedId === flow.id

            // Stats for expanded panel
            const destTvl = chainTvlMap.get(flow.destChain) ?? null
            const destPoolCount = poolCountByChain.get(flow.destChain) ?? null
            const srcPoolCount = poolCountByChain.get(flow.sourceChain) ?? null

            return (
              <div key={flow.id}>
                {/* ── Row ──────────────────────────────────────────────────── */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : flow.id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] transition-colors text-left cursor-pointer"
                >
                  {/* Magnitude dot */}
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />

                  {/* Route */}
                  <div className="w-48 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium text-white/80 truncate max-w-[60px]">
                        {flow.sourceChain}
                      </span>
                      <span className="text-white/25">→</span>
                      <span className="font-medium text-white/80 truncate max-w-[60px]">
                        {flow.destChain}
                      </span>
                    </div>
                    {/* Pool counts per chain */}
                    {(srcPoolCount !== null || destPoolCount !== null) && (
                      <p className="mt-0.5 text-[10px] text-white/25">
                        {srcPoolCount !== null ? `${srcPoolCount} pools` : '—'}
                        {' → '}
                        {destPoolCount !== null ? `${destPoolCount} pools` : '—'}
                      </p>
                    )}
                  </div>

                  {/* Bar */}
                  <div className="flex-1">
                    <div className="h-1.5 w-full rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, background: cfg.bar }}
                      />
                    </div>
                  </div>

                  {/* Value + expand chevron */}
                  <div className="w-28 flex-shrink-0 text-right flex items-center justify-end gap-2">
                    <div>
                      <span
                        className={`text-sm font-semibold ${
                          isInflow ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isInflow ? '+' : ''}
                        {formatTVL(flow.netFlow)}
                      </span>
                      <p className={`text-xs ${cfg.label}`}>{flow.magnitude}</p>
                    </div>
                    <span
                      className={`text-white/30 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      ▾
                    </span>
                  </div>
                </button>

                {/* ── Expanded Chart ────────────────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-5 py-4 bg-white/[0.015]">
                    {/* Stats row above chart */}
                    <div className="mb-3 flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/30">Current TVL</p>
                        <p className="text-sm font-semibold text-white">
                          {destTvl !== null ? formatTVL(destTvl) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/30">7d Net Flow</p>
                        <p className={`text-sm font-semibold ${isInflow ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isInflow ? '+' : ''}{formatTVL(flow.netFlow)}
                        </p>
                      </div>
                      {destPoolCount !== null && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/30">Tracked Pools</p>
                          <p className="text-sm font-semibold text-white">{destPoolCount}</p>
                        </div>
                      )}
                      <div className="ml-auto">
                        <p className="text-[10px] uppercase tracking-wider text-white/30">Signal</p>
                        <p className={`text-sm font-semibold ${cfg.label}`}>{flow.magnitude}</p>
                      </div>
                    </div>

                    <ChainTVLChart
                      chain={flow.destChain}
                      accentColor={cfg.accent}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
