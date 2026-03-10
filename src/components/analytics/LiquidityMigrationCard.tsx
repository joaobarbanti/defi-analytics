'use client'

import { useDefiStore } from '@/store/defi'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatFlow } from '@/lib/transforms/format'
import type { LiquidityFlow } from '@/types/analytics'

// Stable empty array — prevents infinite re-render loop caused by ?? [] creating
// a new reference on every render when analytics is null (Zustand uses Object.is).
const EMPTY_ARRAY: LiquidityFlow[] = []

const MAGNITUDE_BADGE: Record<string, string> = {
  large: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  medium: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  small: 'bg-white/5 text-white/40 border-white/10',
}

/**
 * Card grid showing detected cross-chain liquidity migrations.
 * Large flows get an amber highlight; medium flows get sky blue.
 */
export function LiquidityMigrationCard() {
  const flows = useDefiStore((s) => s.analytics?.flows ?? EMPTY_ARRAY)
  const loading = flows.length === 0

  // Show large and medium flows only, max 6
  const visible = flows.filter((f) => f.magnitude !== 'small').slice(0, 6)

  return (
    <section>
      <SectionHeader
        title="Liquidity Migrations"
        subtitle="Cross-chain capital movement signals"
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 px-6 py-8 text-center">
          <p className="text-sm text-white/30">No significant cross-chain flows detected</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((flow) => (
            <div
              key={flow.id}
              className="rounded-xl border border-white/10 bg-slate-900/60 p-4 hover:border-white/20 transition-colors"
            >
              {/* Source → Dest */}
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="font-medium text-white/80">{flow.sourceChain}</span>
                <span className="text-white/30">→</span>
                <span className="font-semibold text-white">{flow.destChain}</span>
                <span
                  className={`ml-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px] capitalize ${MAGNITUDE_BADGE[flow.magnitude]}`}
                >
                  {flow.magnitude}
                </span>
              </div>

              {/* Flow amount — unsigned: direction conveyed by source → dest arrow */}
              <p className="font-mono text-lg font-bold text-white/90">
                {formatFlow(flow.netFlow, { signed: false })}
              </p>
              <p className="mt-0.5 text-[11px] text-white/30">
                estimated net capital migration
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
