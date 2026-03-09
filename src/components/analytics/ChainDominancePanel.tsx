'use client'

import { useDefiStore } from '@/store/defi'
import { formatTVL } from '@/lib/transforms/format'

// ── Component ─────────────────────────────────────────────────────────────────

export function ChainDominancePanel() {
  const analytics = useDefiStore((s) => s.analytics)
  const chains = analytics?.chainDominance ?? null

  if (!chains || chains.length === 0) return null

  const top10 = chains.slice(0, 10)
  const maxShare = top10[0]?.share ?? 1

  return (
    <section className="px-4 sm:px-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Chain Dominance</h2>
        <p className="text-sm text-white/40">
          TVL market share across the top 10 chains
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
        {top10.map((chain, i) => {
          const sharePct = (chain.share * 100).toFixed(1)
          // Bar width relative to #1 chain (not 100%) so the leader fills the bar
          const barPct = (chain.share / maxShare) * 100

          // Rank-based accent: gold/silver/bronze for top 3, then subdued
          const rankColor =
            i === 0
              ? '#f59e0b'  // gold
              : i === 1
              ? '#94a3b8'  // silver
              : i === 2
              ? '#b45309'  // bronze
              : '#6366f1'  // indigo for rest

          return (
            <div
              key={chain.name}
              className="flex items-center gap-4 px-5 py-3.5"
            >
              {/* Rank */}
              <span
                className="w-5 flex-shrink-0 text-center text-xs font-bold"
                style={{ color: i < 3 ? rankColor : 'rgba(255,255,255,0.25)' }}
              >
                {i + 1}
              </span>

              {/* Chain name + TVL */}
              <div className="w-36 flex-shrink-0">
                <p className="text-sm font-medium text-white/80 truncate">
                  {chain.name}
                </p>
                <p className="text-[10px] text-white/35 mt-0.5">
                  {formatTVL(chain.tvl)}
                </p>
              </div>

              {/* Share bar */}
              <div className="flex-1">
                <div className="h-1.5 w-full rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, background: rankColor, opacity: i < 3 ? 1 : 0.6 }}
                  />
                </div>
              </div>

              {/* Share % */}
              <span className="w-12 flex-shrink-0 text-right text-sm font-semibold text-white/60">
                {sharePct}%
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
