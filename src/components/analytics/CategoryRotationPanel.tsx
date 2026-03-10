'use client'

import { useDefiStore } from '@/store/defi'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatTVL, formatPct } from '@/lib/transforms/format'
import type { CategoryRotation } from '@/types/analytics'

// Stable empty array — prevents a new reference on every render when analytics is null,
// which would cause Zustand's Object.is equality check to always fail and loop infinitely.
const EMPTY_ARRAY: CategoryRotation[] = []

const TREND_STYLES = {
  gaining: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    delta: 'text-emerald-400',
    label: 'Gaining',
  },
  losing: {
    bar: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    delta: 'text-red-400',
    label: 'Losing',
  },
  stable: {
    bar: 'bg-slate-600',
    badge: 'bg-white/5 text-white/40 border-white/10',
    delta: 'text-white/40',
    label: 'Stable',
  },
}

/**
 * TVL distribution by protocol category with trend signals.
 * Shows which categories are gaining or losing DeFi market share.
 */
export function CategoryRotationPanel() {
  const categories = useDefiStore((s) => s.analytics?.categoryRotation ?? EMPTY_ARRAY)
  const loading = categories.length === 0

  const totalTVL = categories.reduce((sum, c) => sum + c.tvl, 0)

  return (
    <section>
      <SectionHeader
        title="Category Rotation"
        subtitle="TVL distribution across protocol categories"
      />

      <div className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {categories.map((cat) => {
              const styles = TREND_STYLES[cat.trend]
              const pct = totalTVL > 0 ? (cat.tvl / totalTVL) * 100 : 0
              return (
                <div
                  key={cat.category}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  {/* Category name */}
                  <span className="w-32 shrink-0 text-sm font-medium text-white/80 truncate">
                    {cat.category}
                  </span>

                  {/* TVL bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${styles.bar}`}
                          style={{ width: `${Math.min(pct * 3, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-mono text-white/50 shrink-0">
                        {formatPct(pct, { signed: false, decimals: 1 })}
                      </span>
                    </div>
                  </div>

                  {/* TVL value */}
                  <span className="w-20 text-right text-xs font-mono text-white/60 shrink-0">
                    {formatTVL(cat.tvl)}
                  </span>

                  {/* 7d share delta in percentage points — "pp" suffix is domain-specific */}
                  <span className={`w-14 text-right text-xs font-mono shrink-0 ${styles.delta}`}>
                    {cat.shareDelta7d > 0 ? '+' : ''}
                    {cat.shareDelta7d.toFixed(1)}pp
                  </span>

                  {/* Trend badge */}
                  <span
                    className={`hidden sm:inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${styles.badge}`}
                  >
                    {styles.label}
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
