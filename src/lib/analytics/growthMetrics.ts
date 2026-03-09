import type { Protocol } from '@/types/defillama'
import type { ProtocolGrowthMetrics, TrendLabel } from '@/types/analytics'

// ── In-memory rank snapshot (lives for the process lifetime) ─────────────────
// Key: slug → previous rank index (0-based, lower = higher ranked)
let previousRanks: Map<string, number> = new Map()
let snapshotDate: string = ''

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function classifyTrend(change7d: number | null): TrendLabel {
  if (change7d === null) return 'Stable'
  if (change7d > 20) return 'Rapid Growth'
  if (change7d > 5) return 'Growing'
  if (change7d > -5) return 'Stable'
  if (change7d > -20) return 'Declining'
  return 'Collapsing'
}

/**
 * Computes growth metrics for each protocol.
 * - momentumScore: weighted combination of 7d and 1d change
 * - tvl30dChange: estimated as change_7d * 4 (transparently approximated)
 * - rankChange: compares current rank vs snapshot stored at module level
 */
export function computeGrowthMetrics(
  protocols: Protocol[]
): Record<string, ProtocolGrowthMetrics> {
  const today = getTodayKey()
  const sorted = [...protocols]
    .filter((p) => p.tvl && p.tvl > 0)
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))

  // Build current rank map
  const currentRanks = new Map(sorted.map((p, i) => [p.slug, i]))

  // Refresh snapshot once per day
  if (snapshotDate !== today) {
    previousRanks = new Map(currentRanks)
    snapshotDate = today
  }

  const result: Record<string, ProtocolGrowthMetrics> = {}

  for (const p of protocols) {
    const c7d = p.change_7d ?? null
    const c1d = p.change_1d ?? null

    const momentumScore =
      c7d !== null && c1d !== null
        ? Math.max(-100, Math.min(200, 0.6 * c7d + 0.4 * c1d))
        : c7d !== null
        ? Math.max(-100, Math.min(200, c7d))
        : 0

    const tvl30dChange = c7d !== null ? c7d * 4 : null

    const currentRank = currentRanks.get(p.slug) ?? null
    const prevRank = previousRanks.get(p.slug) ?? null
    // Positive rankChange = moved up (lower index = higher rank)
    const rankChange =
      currentRank !== null && prevRank !== null
        ? prevRank - currentRank
        : 0

    result[p.slug] = {
      slug: p.slug,
      tvl7dChange: c7d,
      tvl30dChange,
      momentumScore,
      rankChange,
      trendLabel: classifyTrend(c7d),
    }
  }

  // Update snapshot with latest ranks (ensures it's primed on first call)
  if (previousRanks.size === 0) {
    previousRanks = new Map(currentRanks)
    snapshotDate = today
  }

  return result
}
