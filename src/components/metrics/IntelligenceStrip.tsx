'use client'

import { useDefiStore } from '@/store/defi'
import { Sparkline } from '@/components/ui/Sparkline'
import { formatFlow, formatPct } from '@/lib/transforms/format'

/**
 * Bloomberg-style horizontal strip with DEX volume, sentiment, and breadth signals.
 * Sits just below the GlobalMetricsBar to provide intelligence-layer context.
 */
export function IntelligenceStrip() {
  const analytics = useDefiStore((s) => s.analytics)
  const dexOverview = analytics?.dexOverview ?? null
  const sentiment = analytics?.sentiment ?? null
  const growthMetrics = analytics?.growthMetrics ?? {}

  if (!analytics) return null

  // Breadth stats
  const metricsArr = Object.values(growthMetrics)
  const gainers = metricsArr.filter((m) => (m.tvl7dChange ?? 0) > 0).length
  const losers = metricsArr.filter((m) => (m.tvl7dChange ?? 0) < 0).length
  const breadthPct = metricsArr.length > 0 ? (gainers / metricsArr.length) * 100 : null

  // Sentiment color
  const sentimentColor =
    sentiment?.label === 'Bullish'
      ? 'text-emerald-400'
      : sentiment?.label === 'Bearish'
        ? 'text-red-400'
        : 'text-amber-400'

  // DEX volume sparkline data (values only)
  const dexSparkValues = dexOverview?.recentVolumeChart.map((p) => p.tvl) ?? []
  const dexAvg7d = dexOverview ? dexOverview.total7d / 7 : null
  const dexRatio = dexOverview && dexAvg7d ? dexOverview.total24h / dexAvg7d : null

  return (
    <div className="border-b border-t border-white/8 bg-slate-900/50 px-4 py-2 sm:px-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">

          {/* DEX 24h Volume */}
          {dexOverview && (
            <div className="flex items-center gap-2">
              <span className="text-white/30 uppercase tracking-widest">DEX 24h</span>
              <span className="font-mono font-bold text-white/80">
                {formatFlow(dexOverview.total24h, { signed: false })}
              </span>
              {dexRatio != null && (
                <span
                  className={`font-mono ${
                    dexRatio > 1.3
                      ? 'text-emerald-400'
                      : dexRatio < 0.7
                        ? 'text-red-400'
                        : 'text-white/40'
                  }`}
                >
                  {formatPct((dexRatio - 1) * 100)} vs avg
                </span>
              )}
              {dexSparkValues.length > 2 && (
                <Sparkline
                  data={dexSparkValues}
                  color={dexRatio != null && dexRatio > 1 ? '#10b981' : '#ef4444'}
                  height={20}
                  width={48}
                />
              )}
            </div>
          )}

          <span className="h-3 w-px bg-white/10" />

          {/* DEX 7d Volume */}
          {dexOverview && (
            <div className="flex items-center gap-2">
              <span className="text-white/30 uppercase tracking-widest">DEX 7d</span>
              <span className="font-mono text-white/60">
                {formatFlow(dexOverview.total7d, { signed: false })}
              </span>
            </div>
          )}

          <span className="h-3 w-px bg-white/10" />

          {/* Market Breadth */}
          {breadthPct != null && (
            <div className="flex items-center gap-2">
              <span className="text-white/30 uppercase tracking-widest">Breadth</span>
              <span
                className={`font-mono font-bold ${
                  breadthPct > 60
                    ? 'text-emerald-400'
                    : breadthPct < 35
                      ? 'text-red-400'
                      : 'text-amber-400'
                }`}
              >
                {gainers}↑ / {losers}↓
              </span>
              <span className="text-white/30">
                ({formatPct(breadthPct, { decimals: 0, signed: false })} positive)
              </span>
            </div>
          )}

          <span className="h-3 w-px bg-white/10" />

          {/* Sentiment */}
          {sentiment && (
            <div className="flex items-center gap-2">
              <span className="text-white/30 uppercase tracking-widest">Sentiment</span>
              <span className={`font-bold ${sentimentColor}`}>{sentiment.label}</span>
              <span className="text-white/30">
                {formatPct(sentiment.score * 100, { decimals: 0, signed: false })}/100
              </span>
            </div>
          )}

          {/* Timestamp */}
          <div className="ml-auto hidden sm:block text-white/20">
            Updated {new Date(analytics.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}
