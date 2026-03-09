// ─────────────────────────────────────────────
// Risk Classification Types
// ─────────────────────────────────────────────

import type { YieldPool } from './defillama'

/** Three-tier risk ladder for yield pools */
export type RiskLevel = 'low' | 'medium' | 'high'

/**
 * Semantic category derived from pool composition + strategy.
 *
 * stablecoin-lp   — both sides of the pair are stablecoins
 * borrow          — lending / borrowing pools (exposure === 'single', not stablecoin)
 * volatile-lp     — at least one volatile asset in the pair
 * liquid-staking  — LST / LRT protocols (stETH, rETH, etc.)
 * yield-aggregator— auto-compounding vaults / aggregators
 * leveraged       — leveraged farming / looping
 * single-asset    — single-sided staking (no IL risk, not stablecoin)
 */
export type PoolCategory =
  | 'stablecoin-lp'
  | 'borrow'
  | 'volatile-lp'
  | 'liquid-staking'
  | 'yield-aggregator'
  | 'leveraged'
  | 'single-asset'

/** A YieldPool enriched with classification results */
export interface ClassifiedPool extends YieldPool {
  riskLevel: RiskLevel
  category: PoolCategory
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#10b981',    // emerald-500
  medium: '#f59e0b', // amber-500
  high: '#ef4444',   // red-500
}

export const CATEGORY_LABEL: Record<PoolCategory, string> = {
  'stablecoin-lp': 'Stablecoin LP',
  'borrow': 'Borrow',
  'volatile-lp': 'Volatile LP',
  'liquid-staking': 'Liquid Staking',
  'yield-aggregator': 'Aggregator',
  'leveraged': 'Leveraged',
  'single-asset': 'Single Asset',
}

export const CATEGORY_COLOR: Record<PoolCategory, string> = {
  'stablecoin-lp': '#06b6d4',    // cyan-500
  'borrow': '#8b5cf6',           // violet-500
  'volatile-lp': '#f97316',      // orange-500
  'liquid-staking': '#6366f1',   // indigo-500
  'yield-aggregator': '#4ade80', // green-400
  'leveraged': '#f43f5e',        // rose-500
  'single-asset': '#94a3b8',     // slate-400
}
