// ─────────────────────────────────────────────
// Pool Risk & Category Classification Engine
// ─────────────────────────────────────────────
//
// Pure functions — no side-effects, no I/O.
// Input:  YieldPool fields from DeFiLlama /yields/pools API
// Output: RiskLevel + PoolCategory + ClassifiedPool

import type { YieldPool } from '@/types/defillama'
import type { ClassifiedPool, PoolCategory, RiskLevel } from '@/types/risk'

// ── Category heuristics ───────────────────────────────────────────────────────

// Substrings in project slug / symbol that suggest leveraged farming
const LEVERAGED_HINTS = [
  'leverage', 'lever', 'loop', 'folded', 'multiply', 'margin',
]

// Substrings that suggest liquid staking
const LST_HINTS = [
  'lido', 'rocket', 'frax-ether', 'stader', 'ankr', 'mantle-staked',
  'reth', 'steth', 'wsteth', 'cbeth', 'oseth', 'sweth', 'meth',
]

// Substrings that suggest yield aggregators
const AGGREGATOR_HINTS = [
  'yearn', 'beefy', 'harvest', 'autofarm', 'convex', 'aura',
  'concentrator', 'alpaca', 'robovault', 'idle',
]

function hasHint(value: string, hints: string[]): boolean {
  const lower = value.toLowerCase()
  return hints.some((h) => lower.includes(h))
}

/**
 * Classify the semantic category of a yield pool.
 *
 * Decision order (first match wins):
 *   1. Leveraged — project name hints or "Leveraged Farming" in symbol
 *   2. Liquid Staking — LST project names
 *   3. Yield Aggregator — aggregator project names
 *   4. Stablecoin LP — stablecoin flag AND ilRisk present (liquidity pair)
 *   5. Borrow — single exposure, not stablecoin (lending markets)
 *   6. Volatile LP — has IL risk
 *   7. Single Asset — fallback (single-sided, no IL)
 */
export function classifyCategory(pool: YieldPool): PoolCategory {
  const slug = pool.project ?? ''
  const symbol = pool.symbol ?? ''
  const combined = `${slug} ${symbol}`

  if (hasHint(combined, LEVERAGED_HINTS)) return 'leveraged'
  if (hasHint(slug, LST_HINTS) || hasHint(symbol, LST_HINTS)) return 'liquid-staking'
  if (hasHint(slug, AGGREGATOR_HINTS)) return 'yield-aggregator'

  if (pool.stablecoin && pool.ilRisk === 'yes') return 'stablecoin-lp'
  if (pool.stablecoin && pool.exposure === 'multi') return 'stablecoin-lp'

  if (!pool.stablecoin && pool.exposure === 'single') return 'borrow'

  if (pool.ilRisk === 'yes') return 'volatile-lp'

  return 'single-asset'
}

/**
 * Classify the risk level of a yield pool.
 *
 * Rules:
 *   LOW:
 *     - stablecoin === true AND ilRisk !== 'yes' AND tvlUsd >= 1_000_000 AND apy < 25
 *
 *   HIGH (any one of):
 *     - ilRisk === 'yes'  (impermanent loss present)
 *     - apy >= 60         (unsustainably high yield signal)
 *     - tvlUsd < 100_000  (thin / unproven liquidity)
 *
 *   MEDIUM: everything else
 */
export function classifyRisk(pool: YieldPool): RiskLevel {
  // Low: stable, no IL, adequate TVL, sustainable APY
  if (
    pool.stablecoin === true &&
    pool.ilRisk !== 'yes' &&
    pool.tvlUsd >= 1_000_000 &&
    pool.apy < 25
  ) {
    return 'low'
  }

  // High: impermanent loss OR extreme APY OR dust TVL
  if (pool.ilRisk === 'yes' || pool.apy >= 60 || pool.tvlUsd < 100_000) {
    return 'high'
  }

  // Medium: everything in between
  return 'medium'
}

/**
 * Classify a single pool — returns a ClassifiedPool (immutable extension).
 */
export function classifyPool(pool: YieldPool): ClassifiedPool {
  return {
    ...pool,
    riskLevel: classifyRisk(pool),
    category: classifyCategory(pool),
  }
}

/**
 * Classify a batch of pools.
 */
export function classifyPools(pools: YieldPool[]): ClassifiedPool[] {
  return pools.map(classifyPool)
}
