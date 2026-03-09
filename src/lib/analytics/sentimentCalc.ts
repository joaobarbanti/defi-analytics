import type {
  ProtocolGrowthMetrics,
  LiquidityFlow,
  StablecoinSummary,
  MarketSentiment,
  SentimentLabel,
  SentimentDriver,
} from '@/types/analytics'

/**
 * Computes a composite DeFi market sentiment score.
 * Score 0..1: >0.6 = Bullish, <0.4 = Bearish, else Neutral
 *
 * stablecoinSummary may be null if its computation failed; Driver 4 falls
 * back to a neutral score of 0.5 in that case.
 */
export function computeSentiment(
  growthMetrics: Record<string, ProtocolGrowthMetrics>,
  flows: LiquidityFlow[],
  stablecoinSummary: StablecoinSummary | null
): MarketSentiment {
  const drivers: SentimentDriver[] = []

  // ── Driver 1: Protocol momentum (top 20 by TVL) ──────────────────────────
  const allMetrics = Object.values(growthMetrics)
  const top20 = allMetrics.slice(0, 20)
  const avgMomentum =
    top20.length > 0
      ? top20.reduce((s, m) => s + m.momentumScore, 0) / top20.length
      : 0

  // Normalise momentum -100..+200 → 0..1
  const momentumScore = Math.max(0, Math.min(1, (avgMomentum + 100) / 300))
  drivers.push({ label: 'Protocol Momentum', score: momentumScore })

  // ── Driver 2: % of protocols trending up ──────────────────────────────────
  const trendingUp = allMetrics.filter(
    (m) => m.trendLabel === 'Rapid Growth' || m.trendLabel === 'Growing'
  ).length
  const trendRatio = allMetrics.length > 0 ? trendingUp / allMetrics.length : 0.5
  drivers.push({ label: 'Trending Up', score: trendRatio })

  // ── Driver 3: Liquidity flow balance ─────────────────────────────────────
  const largeFlows = flows.filter((f) => f.magnitude === 'large').length
  const medFlows = flows.filter((f) => f.magnitude === 'medium').length
  // More significant flows = higher market activity = slightly bullish
  const flowScore = Math.min(1, (largeFlows * 0.2 + medFlows * 0.1 + 0.3))
  drivers.push({ label: 'Liquidity Activity', score: flowScore })

  // ── Driver 4: Stablecoin expansion ───────────────────────────────────────
  // Large stablecoin supply relative to typical DeFi TVL range is bullish.
  // Falls back to neutral (0.5) when stablecoinSummary is unavailable.
  const stableScore = stablecoinSummary != null
    ? (() => {
        const stableB = stablecoinSummary.totalMarketCap / 1e9
        // Normalise: >$100B is strong, <$20B is weak
        return Math.max(0, Math.min(1, (stableB - 20) / 80))
      })()
    : 0.5
  drivers.push({ label: 'Stablecoin Supply', score: stableScore })

  // ── Composite score ───────────────────────────────────────────────────────
  const weights = [0.4, 0.3, 0.15, 0.15]
  const score = drivers.reduce((sum, d, i) => sum + d.score * weights[i], 0)

  const label: SentimentLabel =
    score > 0.6 ? 'Bullish' : score < 0.4 ? 'Bearish' : 'Neutral'

  return { score, label, drivers }
}
