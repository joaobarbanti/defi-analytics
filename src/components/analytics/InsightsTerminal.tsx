'use client'

import { useDefiStore } from '@/store/defi'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import type { InsightCategory, InsightCard } from '@/types/analytics'

// Stable empty array — prevents infinite re-render loop caused by ?? [] creating
// a new reference on every render when analytics is null (Zustand uses Object.is).
const EMPTY_ARRAY: InsightCard[] = []

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  protocol:   'PROTO',
  liquidity:  'LIQ',
  chain:      'CHAIN',
  stablecoin: 'STBL',
  sentiment:  'MKTD',
}

const CATEGORY_COLOR: Record<InsightCategory, string> = {
  protocol:   'text-violet-400',
  liquidity:  'text-cyan-400',
  chain:      'text-blue-400',
  stablecoin: 'text-emerald-400',
  sentiment:  'text-amber-400',
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

/**
 * Bloomberg Terminal-style insight feed.
 * Renders insights as a scrollable list of timestamped messages.
 */
export function InsightsTerminal() {
  const insights = useDefiStore((s) => s.analytics?.insights ?? EMPTY_ARRAY)
  const loading = insights.length === 0

  return (
    <section>
      <SectionHeader
        title="Intelligence Terminal"
        subtitle="Rule-based market signals · auto-refreshed"
        trailing={
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        }
      />

      <div
        className="rounded-xl border border-white/10 bg-slate-950 overflow-hidden font-mono"
        style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
      >
        {/* Terminal header bar */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900/80 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-2 text-[10px] text-white/20 tracking-widest uppercase">
            DEFI INTELLIGENCE FEED
          </span>
        </div>

        {/* Feed lines */}
        <div className="max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {loading ? (
            <div className="space-y-px p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {insights.map((card, idx) => {
                const catLabel = CATEGORY_LABEL[card.category]
                const catColor = CATEGORY_COLOR[card.category]
                const isWarning = card.headline.startsWith('WARNING:')
                return (
                  <div
                    key={card.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                      isWarning ? 'bg-red-950/30 border-l-2 border-red-500' : ''
                    }`}
                  >
                    {/* Line number */}
                    <span className="w-5 shrink-0 text-[10px] text-white/15 select-none">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* Timestamp */}
                    <span className="w-16 shrink-0 text-[10px] text-white/25">
                      {timeAgo(card.generatedAt)}
                    </span>

                    {/* Category tag */}
                    <span className={`w-12 shrink-0 text-[10px] font-bold ${catColor}`}>
                      [{catLabel}]
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-snug ${
                          isWarning ? 'text-red-300 font-semibold' : 'text-white/80'
                        }`}
                      >
                        {card.headline}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/35 leading-relaxed line-clamp-2">
                        {card.detail}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-slate-900/40 px-4 py-1.5">
          <span className="text-[10px] text-white/20">
            {insights.length} signals active · rule-based engine · no ML
          </span>
        </div>
      </div>
    </section>
  )
}
