'use client'

import { useMemo } from 'react'
import { useDefiStore } from '@/store/defi'
import { computePoolIntelligence } from '@/lib/risk/poolIndicators'
import { computePoolSignalDrivers } from '@/lib/risk/poolSignals'
import type { SentimentLabel } from '@/types/analytics'
import type { ClassifiedPool } from '@/types/risk'

// ── Config ────────────────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<
  SentimentLabel,
  { color: string; bg: string; border: string; barColor: string }
> = {
  Bullish: {
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    barColor: '#10b981',
  },
  Neutral: {
    color: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    barColor: '#64748b',
  },
  Bearish: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    barColor: '#ef4444',
  },
}

// Gauge arc helpers — SVG-based semicircle gauge
function GaugeArc({ score }: { score: number }) {
  // score: 0..1  →  arc sweeps 0..180 degrees (left=bearish, right=bullish)
  const R = 42
  const cx = 56
  const cy = 52
  const startAngle = 180
  const endAngle = 180 - Math.round(score * 180)

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + R * Math.cos(toRad(startAngle))
  const y1 = cy + R * Math.sin(toRad(startAngle))
  const x2 = cx + R * Math.cos(toRad(endAngle))
  const y2 = cy + R * Math.sin(toRad(endAngle))
  const largeArc = score > 0.5 ? 1 : 0

  // Track arc (full 180)
  const tx1 = cx + R * Math.cos(toRad(180))
  const ty1 = cy + R * Math.sin(toRad(180))
  const tx2 = cx + R * Math.cos(toRad(0))
  const ty2 = cy + R * Math.sin(toRad(0))

  const fillColor =
    score >= 0.6 ? '#10b981' : score <= 0.4 ? '#ef4444' : '#64748b'

  return (
    <svg width="112" height="60" viewBox="0 0 112 60">
      {/* Track */}
      <path
        d={`M ${tx1} ${ty1} A ${R} ${R} 0 0 1 ${tx2} ${ty2}`}
        fill="none"
        stroke="#1e293b"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Fill arc */}
      {score > 0.01 && (
        <path
          d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 0 ${x2} ${y2}`}
          fill="none"
          stroke={fillColor}
          strokeWidth="8"
          strokeLinecap="round"
        />
      )}
      {/* Needle dot */}
      <circle cx={x2} cy={y2} r={4} fill={fillColor} />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SentimentIndicatorProps {
  classifiedPools: ClassifiedPool[]
}

export function SentimentIndicator({ classifiedPools }: SentimentIndicatorProps) {
  const analytics = useDefiStore((s) => s.analytics)
  const sentiment = analytics?.sentiment ?? null

  // Derive pool-level signal drivers from live classified pools
  const poolDrivers = useMemo(() => {
    if (!classifiedPools.length) return []
    const report = computePoolIntelligence(classifiedPools)
    return computePoolSignalDrivers(report)
  }, [classifiedPools])

  if (!sentiment) return null

  // Merge: pool-level drivers replace/supplement the analytics-route drivers
  // Pool drivers come first (they are more granular), then any analytics drivers
  // that don't overlap by label
  const poolDriverLabels = new Set(poolDrivers.map((d) => d.label))
  const analyticsOnlyDrivers = sentiment.drivers.filter(
    (d) => !poolDriverLabels.has(d.label)
  )
  const mergedDrivers = [...poolDrivers, ...analyticsOnlyDrivers]

  // Recompute composite score from merged drivers (equal weights)
  const compositeScore =
    mergedDrivers.length > 0
      ? mergedDrivers.reduce((s, d) => s + d.score, 0) / mergedDrivers.length
      : sentiment.score

  const label =
    compositeScore > 0.6 ? 'Bullish' : compositeScore < 0.4 ? 'Bearish' : 'Neutral'

  const cfg = SENTIMENT_CONFIG[label]

  return (
    <section className="px-4 sm:px-8">
      <div
        className={`rounded-2xl border p-6 ${cfg.bg} ${cfg.border}`}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Gauge + Label */}
          <div className="flex flex-col items-center">
            <GaugeArc score={compositeScore} />
            <p className={`mt-1 text-2xl font-black tracking-tight ${cfg.color}`}>
              {label}
            </p>
            <p className="text-xs text-white/40">
              Score: {(compositeScore * 100).toFixed(0)} / 100
            </p>
          </div>

          {/* Drivers */}
          <div className="flex-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Signal Breakdown
            </p>
            {mergedDrivers.map((driver) => (
              <div key={driver.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{driver.label}</span>
                  <span className="text-xs font-medium text-white/50">
                    {(driver.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${driver.score * 100}%`,
                      background: cfg.barColor,
                    }}
                  />
                </div>
                {driver.annotation && (
                  <p className="text-[11px] text-white/30">{driver.annotation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
