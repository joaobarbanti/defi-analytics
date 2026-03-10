import type { Protocol } from '@/types/defillama'
import type { ProtocolGrowthMetrics, TrendLabel, TVLPoint } from '@/types/analytics'

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
 * Computes the real 30-day TVL change % from a sorted history array.
 * Returns null if there are fewer than 2 data points or data is insufficient.
 */
function compute30dChangeFromHistory(points: TVLPoint[]): number | null {
  if (points.length < 2) return null

  const latest = points[points.length - 1]
  const nowMs = latest.date * 1000
  const cutoff = nowMs - 30 * 24 * 3600 * 1000

  // Find the point closest to 30 days ago
  let oldest = points[0]
  for (const p of points) {
    if (p.date * 1000 >= cutoff) {
      oldest = p
      break
    }
  }

  if (oldest.tvl <= 0 || latest.tvl <= 0) return null
  if (oldest === latest) return null

  const change = ((latest.tvl - oldest.tvl) / oldest.tvl) * 100
  return Number.isFinite(change) ? change : null
}

/**
 * Computes the real 7-day TVL change % from a sorted history array.
 */
function compute7dChangeFromHistory(points: TVLPoint[]): number | null {
  if (points.length < 2) return null

  const latest = points[points.length - 1]
  const nowMs = latest.date * 1000
  const cutoff = nowMs - 7 * 24 * 3600 * 1000

  let oldest = points[0]
  for (const p of points) {
    if (p.date * 1000 >= cutoff) {
      oldest = p
      break
    }
  }

  if (oldest.tvl <= 0 || latest.tvl <= 0) return null
  if (oldest === latest) return null

  const change = ((latest.tvl - oldest.tvl) / oldest.tvl) * 100
  return Number.isFinite(change) ? change : null
}

/**
 * Computes growth metrics for each protocol.
 * - momentumScore: weighted combination of 7d and 1d change
 * - tvl30dChange: real from history if provided, otherwise estimated as change_7d * 4
 * - rankChange: compares current rank vs snapshot stored at module level
 *
 * @param protocols - full protocol list
 * @param protocolHistories - optional map of slug → TVL history points for real 30d computation
 */
export function computeGrowthMetrics(
  protocols: Protocol[],
  protocolHistories?: Map<string, TVLPoint[]>
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
    const history = protocolHistories?.get(p.slug)
    const hasRealHistory = !!(history && history.length >= 7)

    // Use real history when available, fall back to DeFiLlama API field
    const c7d = hasRealHistory
      ? (compute7dChangeFromHistory(history!) ?? p.change_7d ?? null)
      : (p.change_7d ?? null)

    const c1d = p.change_1d ?? null

    const momentumScore =
      c7d !== null && c1d !== null
        ? Math.max(-100, Math.min(200, 0.6 * c7d + 0.4 * c1d))
        : c7d !== null
        ? Math.max(-100, Math.min(200, c7d))
        : 0

    // Real 30d change if history available, otherwise estimate
    const tvl30dChange = hasRealHistory
      ? (compute30dChangeFromHistory(history!) ?? (c7d !== null ? c7d * 4 : null))
      : (c7d !== null ? c7d * 4 : null)

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
      hasRealHistory,
    }
  }

  // Update snapshot with latest ranks (ensures it's primed on first call)
  if (previousRanks.size === 0) {
    previousRanks = new Map(currentRanks)
    snapshotDate = today
  }

  return result
}
