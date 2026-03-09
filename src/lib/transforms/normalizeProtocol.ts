// Category → hex color mapping for protocol nodes
export const CATEGORY_COLORS: Record<string, string> = {
  'Dexes': '#3b82f6',           // blue
  'Lending': '#8b5cf6',         // violet
  'Yield': '#10b981',           // emerald
  'Bridge': '#f59e0b',          // amber
  'Staking': '#06b6d4',         // cyan
  'Derivatives': '#ef4444',     // red
  'Liquid Staking': '#6366f1',  // indigo
  'Stablecoins': '#84cc16',     // lime
  'CDP': '#f97316',             // orange
  'Insurance': '#ec4899',       // pink
  'Options': '#14b8a6',         // teal
  'Payments': '#a855f7',        // purple
  'NFT': '#e879f9',             // fuchsia
  'Gaming': '#fb923c',          // orange-400
  'Oracle': '#facc15',          // yellow
  'Yield Aggregator': '#4ade80',// green-400
  'Cross Chain': '#38bdf8',     // sky
  'Algo-Stables': '#c084fc',    // purple-400
  'RWA': '#fb7185',             // rose-400
  'Leveraged Farming': '#a3e635',// lime-400
  'Synthetics': '#2dd4bf',      // teal-400
  'Reserve Currency': '#818cf8', // indigo-400
  'Default': '#94a3b8',         // slate-400
}

export function assignNodeColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Default']
}

// TVL → node radius mapping (logarithmic scale, clamped to 0.3–3.0 units)
export function computeNodeSize(tvl: number): number {
  if (!tvl || tvl <= 0) return 0.3
  const log = Math.log10(tvl)
  // TVL range: ~$1M (6) to ~$50B (10.7)
  const normalized = (log - 6) / (10.7 - 6)
  const clamped = Math.max(0, Math.min(1, normalized))
  return 0.3 + clamped * 2.7
}

// APY → node radius for yield cloud (log scale, clamped to 0.5–2.5 units)
export function computeAPYNodeSize(apy: number): number {
  if (!apy || apy <= 0) return 0.5
  // APY range: ~1% (0) to ~500% (log10(500)≈2.7)
  const log = Math.log10(Math.max(apy, 1))
  const normalized = log / 2.7
  const clamped = Math.max(0, Math.min(1, normalized))
  return 0.5 + clamped * 2.0
}

// APY tier → color for yield cloud
export function apyTierColor(apy: number): string {
  if (apy >= 100) return '#f43f5e'   // rose — ultra high
  if (apy >= 50)  return '#f97316'   // orange — very high
  if (apy >= 20)  return '#eab308'   // yellow — high
  if (apy >= 10)  return '#10b981'   // emerald — medium
  if (apy >= 5)   return '#06b6d4'   // cyan — moderate
  return '#6366f1'                    // indigo — low
}

// Normalize raw protocol data into a visualization-ready shape
import type { Protocol, ProtocolNode, YieldNode, YieldPool } from '@/types/defillama'
import { classifyRisk } from '@/lib/risk/classifyPool'

export function normalizeProtocol(
  protocol: Protocol,
  apy: number | null = null
): ProtocolNode {
  const primaryChain =
    protocol.chains?.[0] ?? 'Unknown'

  return {
    id: protocol.id ?? protocol.slug,
    name: protocol.name,
    symbol: protocol.symbol,
    slug: protocol.slug,
    tvl: protocol.tvl ?? 0,
    category: protocol.category ?? 'Default',
    chains: protocol.chains ?? [],
    primaryChain,
    logo: protocol.logo ?? null,
    url: protocol.url ?? null,
    change_1d: protocol.change_1d ?? null,
    change_7d: protocol.change_7d ?? null,
    // Physics (will be set by simulation)
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    // Visual
    radius: computeNodeSize(protocol.tvl ?? 0),
    color: assignNodeColor(protocol.category ?? 'Default'),
    apy,
  }
}

/** Convert a raw YieldPool into a YieldNode ready for 3D rendering */
export function normalizeYieldPool(pool: YieldPool, index: number): YieldNode {
  const color = apyTierColor(pool.apy)
  const radius = computeAPYNodeSize(pool.apy)

  // Spread nodes in a ring layout — positions will be overridden in TopAPYCloud
  return {
    // ProtocolNode base fields
    id: pool.pool,
    name: pool.project,
    symbol: pool.symbol,
    slug: pool.project,
    tvl: pool.tvlUsd,
    category: 'Yield',
    chains: [pool.chain],
    primaryChain: pool.chain,
    logo: null, // graceful degradation — TopAPYCloud can attempt to resolve
    url: null,
    change_1d: pool.apyPct1D ?? null,
    change_7d: pool.apyPct7D ?? null,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius,
    color,
    apy: pool.apy,
    // YieldNode extras
    poolId: pool.pool,
    poolSymbol: pool.symbol,
    tvlUsd: pool.tvlUsd,
    apyBase: pool.apyBase,
    apyReward: pool.apyReward,
    apyPct1D: pool.apyPct1D ?? null,
    apyPct7D: pool.apyPct7D ?? null,
  }
}

/**
 * Return the top 10 yield pools by APY, filtering out:
 *   - apy === 0 or null
 *   - apy > 1000 (outliers / broken data)
 *   - tvlUsd < 10_000 (dust pools)
 */
export function getTop10ByAPY(pools: YieldPool[]): YieldNode[] {
  return [...pools]
    .filter(
      (p) =>
        p.apy != null &&
        p.apy > 0 &&
        p.apy < 1000 &&
        p.tvlUsd >= 10_000
    )
    .sort((a, b) => b.apy - a.apy)
    .slice(0, 10)
    .map((pool, i) => normalizeYieldPool(pool, i))
}

/**
 * Return the top 10 LOW-RISK yield pools by APY.
 *
 * Filters applied (in order):
 *   1. Basic sanity: apy > 0, apy < 1000, tvlUsd >= 10_000
 *   2. Risk gate: classifyRisk(pool) === 'low'
 *      → stablecoin, no IL, tvl >= $1M, apy < 25%
 *   3. Sort by APY descending
 *   4. Take top 10
 *
 * Falls back to top-10 safe-medium pools if fewer than 10 low-risk pools exist.
 */
export function getTop10SafeByAPY(pools: YieldPool[]): YieldNode[] {
  const sane = [...pools].filter(
    (p) =>
      p.apy != null &&
      p.apy > 0 &&
      p.apy < 1000 &&
      p.tvlUsd >= 10_000
  )

  // Primary: low-risk only
  const lowRisk = sane
    .filter((p) => classifyRisk(p) === 'low')
    .sort((a, b) => b.apy - a.apy)
    .slice(0, 10)

  if (lowRisk.length >= 10) {
    return lowRisk.map((pool, i) => normalizeYieldPool(pool, i))
  }

  // Fallback: top (10 - lowRiskCount) medium-risk pools to fill remainder
  const needed = 10 - lowRisk.length
  const mediumFill = sane
    .filter((p) => classifyRisk(p) === 'medium')
    .sort((a, b) => b.apy - a.apy)
    .slice(0, needed)

  return [...lowRisk, ...mediumFill].map((pool, i) => normalizeYieldPool(pool, i))
}

// Cap to top N protocols by TVL
export function filterTopProtocols(
  protocols: Protocol[],
  limit = 300
): Protocol[] {
  return [...protocols]
    .filter((p) => p.tvl && p.tvl > 0)
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
    .slice(0, limit)
}
