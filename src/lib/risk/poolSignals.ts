// ─────────────────────────────────────────────
// Pool Intelligence — Signal Drivers
// ─────────────────────────────────────────────
// Converts a PoolIntelligenceReport into SentimentDriver[] for use by
// SentimentIndicator. Each driver maps a pool-level ratio to a 0..1 score,
// an investor-friendly label, and a % annotation subtext.

import type { PoolIntelligenceReport } from '@/types/risk'
import type { SentimentDriver } from '@/types/analytics'

/**
 * Derives market sentiment signal drivers from pool-level composition ratios.
 *
 * Driver breakdown:
 *  1. Capital Safety     — % of pools classified stable & safe (higher = bullish)
 *  2. Market Health      — inverse suspicious pool rate (higher = healthier)
 *  3. Yield Quality      — inverse reward-dependency rate (higher = more base yield)
 *  4. Staking Demand     — LST participation rate (higher = ecosystem maturity)
 *  5. Incentive Climate  — transient pool rate, optimal in the 5–20% band
 *  6. High-APY Opps      — aggressive profile pool count / richness signal
 */
export function computePoolSignalDrivers(
  report: PoolIntelligenceReport
): SentimentDriver[] {
  if (report.totalAnalyzed === 0) return []

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`

  const drivers: SentimentDriver[] = []

  // ── 1. Capital Safety ────────────────────────────────────────────────────
  // pctSafe 0..1 → bullish; 25% safe pools = full score
  const safeScore = Math.min(1, report.pctSafe * 4)
  drivers.push({
    label: 'Capital Safety',
    score: safeScore,
    annotation: `${pct(report.pctSafe)} of pools stable & safe · $5M+ TVL`,
  })

  // ── 2. Market Health (inverted suspicious) ───────────────────────────────
  // High suspicious% = bearish; invert so 0 suspicious → score 1.0
  const healthScore = Math.max(0, 1 - report.pctSuspicious * 2)
  drivers.push({
    label: 'Market Health',
    score: healthScore,
    annotation: `${pct(report.pctSuspicious)} suspicious · ${report.suspiciousCount} pools with 2+ risk flags`,
  })

  // ── 3. Yield Quality (inverted reward-dependency) ────────────────────────
  // High reward-only% = fragile, not sustainable; invert
  const qualityScore = Math.max(0, 1 - report.pctRewardOnly * 1.5)
  drivers.push({
    label: 'Yield Quality',
    score: qualityScore,
    annotation: `${pct(report.pctRewardOnly)} reward-driven · ${pct(1 - report.pctRewardOnly)} base-yield`,
  })

  // ── 4. Staking Demand ────────────────────────────────────────────────────
  // LST pools signal mature ETH/BTC staking ecosystem demand
  const lstScore = Math.min(1, report.pctLst * 5) // 20% LST → score 1.0
  drivers.push({
    label: 'Staking Demand',
    score: lstScore,
    annotation: `${pct(report.pctLst)} liquid staking pools · ${report.lstCount} total`,
  })

  // ── 5. Incentive Climate ─────────────────────────────────────────────────
  // Some transient pools = healthy protocol competition; too many = inflation risk
  const incentiveScore =
    report.pctTransient < 0.05
      ? report.pctTransient * 10
      : Math.max(0, 0.7 - (report.pctTransient - 0.05) * 2)
  drivers.push({
    label: 'Incentive Climate',
    score: Math.min(1, Math.max(0, incentiveScore)),
    annotation: `${pct(report.pctTransient)} incentivised pools · optimal band 5–20%`,
  })

  // ── 6. High-APY Opportunities ────────────────────────────────────────────
  // Score based on how well-populated the aggressive profile is.
  // 10+ aggressive pools = full signal; uses confidenceScore as a richness proxy.
  const aggressiveProfile = report.profiles.aggressive
  const highApyScore = aggressiveProfile.confidenceScore / 100
  drivers.push({
    label: 'High-APY Opportunities',
    score: highApyScore,
    annotation: `${aggressiveProfile.poolCount} pools in 25–200% APY range · avg ${aggressiveProfile.avgApy.toFixed(1)}%`,
  })

  return drivers
}
