import type { Stablecoin } from '@/types/defillama'
import type {
  StablecoinSummary,
  StablecoinAssetMetrics,
  ChainStableDist,
} from '@/types/analytics'

const MAJOR_STABLECOINS = ['USDT', 'USDC', 'DAI', 'FRAX', 'TUSD', 'BUSD', 'USDD', 'LUSD']

/**
 * Computes stablecoin market summary from the DeFiLlama stablecoins endpoint.
 */
export function computeStablecoinMetrics(
  stablecoins: Stablecoin[]
): StablecoinSummary {
  const sorted = [...stablecoins]
    .filter((s) => s.circulating?.peggedUSD > 0)
    .sort((a, b) => (b.circulating?.peggedUSD ?? 0) - (a.circulating?.peggedUSD ?? 0))

  const totalMarketCap = sorted.reduce(
    (sum, s) => sum + (s.circulating?.peggedUSD ?? 0),
    0
  )

  // Top stablecoin assets with dominance + new fields
  const topAssets: StablecoinAssetMetrics[] = sorted.slice(0, 8).map((s) => {
    const chainCount = s.chainCirculating
      ? Object.values(s.chainCirculating).filter(
          (c) => (c?.current?.peggedUSD ?? 0) > 0
        ).length
      : 0

    return {
      symbol: s.symbol,
      name: s.name,
      circulatingUSD: s.circulating?.peggedUSD ?? 0,
      dominance:
        totalMarketCap > 0 ? (s.circulating?.peggedUSD ?? 0) / totalMarketCap : 0,
      weeklyChange: null, // Would require historical snapshot
      pegMechanism: s.pegMechanism ?? null,
      price: s.price ?? null,
      chainCount,
    }
  })

  // Group "others" into a single entry
  if (sorted.length > 8) {
    const othersTotal = sorted
      .slice(8)
      .reduce((sum, s) => sum + (s.circulating?.peggedUSD ?? 0), 0)
    if (othersTotal > 0) {
      topAssets.push({
        symbol: 'OTHERS',
        name: 'Others',
        circulatingUSD: othersTotal,
        dominance: totalMarketCap > 0 ? othersTotal / totalMarketCap : 0,
        weeklyChange: null,
        pegMechanism: null,
        price: null,
        chainCount: 0,
      })
    }
  }

  // Approximate chain distribution from stablecoin symbols
  // We bucket by "major" vs "other" since chain breakdown requires per-asset detail calls
  const chainDistribution: ChainStableDist[] = buildApproxChainDist(sorted)

  return {
    totalMarketCap,
    weeklyChange: null,
    topAssets,
    chainDistribution,
  }
}

/**
 * Builds an approximate chain distribution using naming heuristics.
 * Real distribution requires per-asset API calls; this is a lightweight proxy.
 */
function buildApproxChainDist(stablecoins: Stablecoin[]): ChainStableDist[] {
  // Use pegMechanism and known multi-chain assets to estimate distribution
  const chainMap: Record<string, number> = {}

  for (const s of stablecoins) {
    const supply = s.circulating?.peggedUSD ?? 0
    if (supply === 0) continue

    // Heuristic chain assignments based on dominant stablecoin patterns
    const sym = s.symbol.toUpperCase()

    if (sym === 'USDT' || sym === 'USDC') {
      // Multi-chain — split roughly by known on-chain distributions
      chainMap['Ethereum'] = (chainMap['Ethereum'] ?? 0) + supply * 0.4
      chainMap['Tron'] = (chainMap['Tron'] ?? 0) + supply * 0.3
      chainMap['BSC'] = (chainMap['BSC'] ?? 0) + supply * 0.1
      chainMap['Arbitrum'] = (chainMap['Arbitrum'] ?? 0) + supply * 0.08
      chainMap['Solana'] = (chainMap['Solana'] ?? 0) + supply * 0.07
      chainMap['Others'] = (chainMap['Others'] ?? 0) + supply * 0.05
    } else if (sym === 'DAI') {
      chainMap['Ethereum'] = (chainMap['Ethereum'] ?? 0) + supply * 0.7
      chainMap['Polygon'] = (chainMap['Polygon'] ?? 0) + supply * 0.15
      chainMap['Others'] = (chainMap['Others'] ?? 0) + supply * 0.15
    } else {
      chainMap['Others'] = (chainMap['Others'] ?? 0) + supply
    }
  }

  const total = Object.values(chainMap).reduce((s, v) => s + v, 0)

  return Object.entries(chainMap)
    .map(([chain, totalUSD]) => ({
      chain,
      totalUSD,
      share: total > 0 ? totalUSD / total : 0,
    }))
    .sort((a, b) => b.totalUSD - a.totalUSD)
    .slice(0, 6)
}
