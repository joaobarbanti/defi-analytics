// ─────────────────────────────────────────────
// Analytics Types
// ─────────────────────────────────────────────

export type TrendLabel =
  | 'Rapid Growth'
  | 'Growing'
  | 'Stable'
  | 'Declining'
  | 'Collapsing'

export interface TVLPoint {
  date: number   // unix timestamp (seconds)
  tvl: number    // USD value
}

export interface ProtocolGrowthMetrics {
  slug: string
  tvl7dChange: number | null   // % change over 7 days
  tvl30dChange: number | null  // % change over 30 days (real if history available, estimated otherwise)
  momentumScore: number        // weighted score -100..+200
  rankChange: number           // positive = moved up
  trendLabel: TrendLabel
  /** true when tvl30dChange came from real historical data, false when estimated via change_7d × 4 */
  hasRealHistory: boolean
}

/** A single entry in the growth leaderboard */
export interface GrowthLeaderboardEntry {
  slug: string
  name: string
  logo: string | null
  category: string
  tvl: number
  change7d: number | null
  change30d: number | null
  hasRealHistory: boolean
  /** Last 30 TVL data points for sparkline rendering */
  sparklinePoints: TVLPoint[]
}

export interface ChainDominance {
  name: string
  tvl: number
  share: number        // 0..1 fraction of total TVL
  shareChange7d: number | null  // percentage point change
}

export interface LiquidityFlow {
  id: string
  sourceChain: string
  destChain: string
  netFlow: number     // USD value (positive = into dest)
  magnitude: 'large' | 'medium' | 'small'
}

export interface StablecoinAssetMetrics {
  symbol: string
  name: string
  circulatingUSD: number
  dominance: number    // 0..1
  weeklyChange: number | null  // estimated % change
  /** peg mechanism from DeFiLlama: 'fiat', 'crypto', 'algorithmic', etc. */
  pegMechanism: string | null
  /** latest price from DeFiLlama; null if unknown */
  price: number | null
  /** number of chains this stablecoin is deployed on */
  chainCount: number
}

export interface StablecoinSummary {
  totalMarketCap: number
  weeklyChange: number | null
  topAssets: StablecoinAssetMetrics[]
  chainDistribution: ChainStableDist[]
}

export interface ChainStableDist {
  chain: string
  totalUSD: number
  share: number
}

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertType =
  | 'protocol_growth'
  | 'protocol_decline'
  | 'top20_entry'
  | 'chain_dominance_shift'
  | 'stablecoin_change'

export interface MarketAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  body: string
  protocolSlug?: string
  chain?: string
  timestamp: number
}

export type InsightCategory =
  | 'chain'
  | 'protocol'
  | 'stablecoin'
  | 'liquidity'
  | 'sentiment'

export interface InsightCard {
  id: string
  headline: string
  detail: string
  category: InsightCategory
  linkedSlug?: string
  linkedChain?: string
  generatedAt: number
}

export type SentimentLabel = 'Bullish' | 'Neutral' | 'Bearish'

export interface SentimentDriver {
  label: string
  score: number       // 0..1
  /** Optional % annotation subtext shown below the bar e.g. "34% of pools stable" */
  annotation?: string
}

export interface MarketSentiment {
  score: number           // 0..1
  label: SentimentLabel
  drivers: SentimentDriver[]
}

export interface CategoryRotation {
  category: string
  tvl: number
  share: number          // 0..1 fraction of total protocol TVL
  shareDelta7d: number   // percentage point change estimate
  trend: 'gaining' | 'losing' | 'stable'
}

export interface ChainFlowEntry {
  chain: string
  tvl: number
  netFlow7d: number    // estimated USD net flow over 7d (positive = inflow)
  shareChange7d: number | null  // pp change in total TVL share
  direction: 'inflow' | 'outflow' | 'neutral'
}

export interface DexOverviewSummary {
  total24h: number
  total7d: number
  /** Latest 30 days of global DEX volume, for sparkline */
  recentVolumeChart: TVLPoint[]
}

export interface AnalyticsPayload {
  growthMetrics: Record<string, ProtocolGrowthMetrics>
  /** Top 15 fastest-growing protocols with sparklines */
  growthLeaderboard: GrowthLeaderboardEntry[]
  flows: LiquidityFlow[]
  chainDominance: ChainDominance[]
  /** Ranked chain inflow/outflow entries */
  chainFlows: ChainFlowEntry[]
  /** TVL share by protocol category */
  categoryRotation: CategoryRotation[]
  // Nullable — computation may fail gracefully; components must guard against null
  stablecoinSummary: StablecoinSummary | null
  alerts: MarketAlert[]
  insights: InsightCard[]
  // Nullable — computation may fail gracefully; components must guard against null
  sentiment: MarketSentiment | null
  /** Nullable — DEX volume data; null if fetch fails */
  dexOverview: DexOverviewSummary | null
  generatedAt: number
}
