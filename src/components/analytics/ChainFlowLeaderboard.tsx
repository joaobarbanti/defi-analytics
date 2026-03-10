'use client'

import { useDefiStore } from '@/store/defi'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatTVL, formatFlow } from '@/lib/transforms/format'
import type { ChainFlowEntry } from '@/types/analytics'

// Stable empty array — prevents infinite re-render loop caused by ?? [] creating
// a new reference on every render when analytics is null (Zustand uses Object.is).
const EMPTY_ARRAY: ChainFlowEntry[] = []

const DIRECTION_STYLES = {
  inflow: 'text-emerald-400',
  outflow: 'text-red-400',
  neutral: 'text-white/40',
}

const DIRECTION_ARROWS = {
  inflow: '▲',
  outflow: '▼',
  neutral: '—',
}

const BAR_COLORS = {
  inflow: 'bg-emerald-500',
  outflow: 'bg-red-500',
  neutral: 'bg-white/20',
}

/**
 * Ranked table of chains by estimated 7-day net capital flow.
 * Inflows are green, outflows are red, with an inline bar for visual scale.
 */
export function ChainFlowLeaderboard() {
  const entries = useDefiStore((s) => s.analytics?.chainFlows ?? EMPTY_ARRAY)
  const loading = entries.length === 0

  // Compute max absolute flow for bar width scaling
  const maxFlow = Math.max(...entries.map((e) => Math.abs(e.netFlow7d)), 1)

  return (
    <section>
      <SectionHeader
        title="Chain Capital Flows"
        subtitle="Estimated 7-day net TVL movement by chain"
      />

      <div className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {entries.map((entry) => {
              const barPct = Math.min((Math.abs(entry.netFlow7d) / maxFlow) * 100, 100)
              return (
                <div
                  key={entry.chain}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                >
                  {/* Direction indicator */}
                  <span
                    className={`w-4 text-center text-xs shrink-0 ${DIRECTION_STYLES[entry.direction]}`}
                  >
                    {DIRECTION_ARROWS[entry.direction]}
                  </span>

                  {/* Chain name */}
                  <span className="w-28 shrink-0 text-sm font-medium text-white/80 truncate">
                    {entry.chain}
                  </span>

                  {/* Bar + flow amount */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${BAR_COLORS[entry.direction]}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span
                        className={`w-20 text-right text-xs font-mono shrink-0 ${DIRECTION_STYLES[entry.direction]}`}
                      >
                        {formatFlow(entry.netFlow7d)}
                      </span>
                    </div>
                  </div>

                  {/* TVL */}
                  <span className="w-20 text-right text-xs font-mono text-white/40 shrink-0">
                    {formatTVL(entry.tvl)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
