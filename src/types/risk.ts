// ─────────────────────────────────────────────
// Risk Classification Types
// ─────────────────────────────────────────────

import type { YieldPool } from './defillama'

// ── Pool Intelligence Types ───────────────────────────────────────────────────

/** Signals that can be raised on an individual pool */
export type PoolFlag =
  | 'reward_driven'    // >80% of APY is reward tokens
  | 'low_tvl'          // TVL < $500k
  | 'extreme_apy'      // APY > 200%
  | 'apy_crash'        // 7d APY drop > 50%
  | 'stable_safe'      // stablecoin, low-risk, TVL≥5M, APY 2–25%
  | 'transient'        // reward APY > 5%, TVL≥2M, not high-risk
  | 'lst'              // liquid staking token pool

/** Per-pool signal result */
export interface PoolIndicator {
  poolId: string
  symbol: string
  project: string
  /** Optional display name for the protocol (may differ from project slug) */
  protocolName?: string
  chain: string
  flags: PoolFlag[]
  apy: number
  tvlUsd: number
}

/**
 * The three investor profiles we surface on PoolIntelligenceOverview.
 * Each profile contains a recommended pool count, a calculated reason list,
 * and top matching pools.
 */
export type InvestorProfileType = 'conservative' | 'moderate' | 'aggressive'

export interface InvestorProfile {
  type: InvestorProfileType
  label: string
  poolCount: number
  avgApy: number
  totalTvl: number
  /** 2–4 data-driven bullets explaining why this profile's pools were selected */
  reasons: string[]
  topPools: PoolIndicator[]
  /**
   * Confidence score 0–100: how strongly the data supports this profile.
   * Higher = more qualifying pools, higher TVL, more stable composition.
   */
  confidenceScore: number
  /**
   * Risk warnings specific to this profile's current pool composition.
   * Shown in amber/red below the reasons list.
   */
  riskWarnings: string[]
}

export interface PoolIntelligenceReport {
  totalAnalyzed: number
  stableSafeCount: number
  suspiciousCount: number
  transientCount: number
  lstCount: number
  /** Ratios for sentiment driver wiring (Phase 3) */
  pctSafe: number         // 0..1
  pctSuspicious: number   // 0..1
  pctRewardOnly: number   // 0..1  (>80% reward-driven)
  pctTransient: number    // 0..1
  pctLst: number          // 0..1
  profiles: Record<InvestorProfileType, InvestorProfile>
  generatedAt: number
}

// ── Core Classification Types ─────────────────────────────────────────────────

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

// ── Protocol Recommendation Types ─────────────────────────────────────────────

/**
 * A protocol-level recommendation derived from aggregating ClassifiedPool data.
 * Surfaced by the SignalDriversPanel in a 3-column analyst layout.
 */
export interface ProtocolRecommendation {
  protocolSlug: string
  protocolName: string
  chain: string
  logo: string | null
  category: PoolCategory
  avgApy: number
  totalTvl: number
  /** 0–100: higher = more data, higher TVL, cleaner flag composition */
  confidenceScore: number
  primaryReason: string
  supportingFactors: string[]
  riskWarnings: string[]
  profileType: InvestorProfileType
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
