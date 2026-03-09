// ─────────────────────────────────────────────
// DeFiLlama API Types
// ─────────────────────────────────────────────

export interface Protocol {
  id: string
  name: string
  symbol: string
  slug: string
  tvl: number
  chainTvls: Record<string, number>
  change_1h: number | null
  change_1d: number | null
  change_7d: number | null
  mcap: number | null
  fdv: number | null
  category: string
  chains: string[]
  logo: string | null
  url: string | null
  description: string | null
  twitter: string | null
  forkedFrom: string[]
  audits: string | null
  listedAt: number | null
}

export interface ProtocolDetail extends Protocol {
  tvlHistory: TVLDataPoint[]
  currentChainTvls: Record<string, number>
}

export interface TVLDataPoint {
  date: number
  totalLiquidityUSD: number
}

export interface Chain {
  gecko_id: string | null
  tvl: number
  tokenSymbol: string
  cmcId: string | null
  name: string
  chainId: number | null
}

export interface YieldPool {
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  apyBase: number | null
  apyReward: number | null
  apy: number
  apyPct1D: number | null
  apyPct7D: number | null
  pool: string
  underlyingTokens: string[]
  rewardTokens: string[] | null
  ilRisk: string
  exposure: string
  stablecoin: boolean
}

export interface Stablecoin {
  id: string
  name: string
  symbol: string
  gecko_id: string | null
  peg: string
  pegMechanism: string
  circulating: { peggedUSD: number }
  price: number | null
}

// ─────────────────────────────────────────────
// Visualization / Graph Types
// ─────────────────────────────────────────────

export interface ProtocolNode {
  id: string
  name: string
  symbol: string
  slug: string
  tvl: number
  category: string
  chains: string[]
  primaryChain: string
  logo: string | null
  url: string | null
  change_1d: number | null
  change_7d: number | null
  // Graph physics
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  // Visual properties
  radius: number
  color: string
  apy: number | null
}

/** A node in the Top-10 APY cloud — extends ProtocolNode with pool-specific data */
export interface YieldNode extends ProtocolNode {
  poolId: string
  poolSymbol: string
  tvlUsd: number
  apyBase: number | null
  apyReward: number | null
  apyPct1D: number | null
  apyPct7D: number | null
}

export interface GlobalMetrics {
  totalTVL: number
  protocolCount: number
  avgAPY: number | null
  topChain: { name: string; tvl: number } | null
}
