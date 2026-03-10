import type { Protocol, Chain } from '@/types/defillama'
import type { LiquidityFlow, ChainDominance, ChainFlowEntry } from '@/types/analytics'

/**
 * Extracts a numeric TVL value from a chainTvls entry.
 * DeFiLlama sometimes returns nested objects like { tvl: 123, tokens: {...} }
 * instead of plain numbers. This handles both cases safely.
 */
function extractTvlNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (value !== null && typeof value === 'object') {
    const nested = (value as Record<string, unknown>).tvl
    if (typeof nested === 'number' && Number.isFinite(nested)) return nested
  }
  return 0
}

/**
 * Computes net inflow/outflow per chain by aggregating protocol TVL changes.
 * Uses change_7d × current TVL as a proxy for net flow (directionally accurate).
 */
export function computeChainFlows(
  protocols: Protocol[],
  chains: Chain[]
): LiquidityFlow[] {
  // Net flow per chain: sum of (change_7d/100 * tvl) across protocols on that chain
  const chainNetFlow = new Map<string, number>()

  for (const p of protocols) {
    if (!p.chainTvls || !p.change_7d) continue
    const c7d = p.change_7d / 100
    if (!Number.isFinite(c7d)) continue

    for (const [chain, tvlRaw] of Object.entries(p.chainTvls)) {
      const tvlNum = extractTvlNumber(tvlRaw)
      if (tvlNum <= 0) continue
      const flow = c7d * tvlNum
      if (!Number.isFinite(flow)) continue
      chainNetFlow.set(chain, (chainNetFlow.get(chain) ?? 0) + flow)
    }
  }

  // Sort chains by absolute flow magnitude
  const entries = Array.from(chainNetFlow.entries())
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  const totalTVL = chains.reduce((s, c) => s + (c.tvl ?? 0), 0)
  const threshold = totalTVL * 0.001 // 0.1% of total TVL

  const flows: LiquidityFlow[] = []

  // Pair top gainers vs top losers as virtual flow vectors
  const gainers = entries.filter(([, v]) => v > threshold).slice(0, 5)
  const losers = entries.filter(([, v]) => v < -threshold).slice(0, 5)

  for (let i = 0; i < Math.min(gainers.length, losers.length, 5); i++) {
    const [destChain, inflow] = gainers[i]
    const [sourceChain] = losers[i]
    const netFlow = Math.abs(inflow)
    if (!Number.isFinite(netFlow) || netFlow === 0) continue

    flows.push({
      id: `${sourceChain}->${destChain}`,
      sourceChain,
      destChain,
      netFlow,
      magnitude:
        netFlow > totalTVL * 0.01
          ? 'large'
          : netFlow > totalTVL * 0.003
          ? 'medium'
          : 'small',
    })
  }

  return flows
}

/**
 * Computes each chain's share of total DeFi TVL.
 * shareChange7d is estimated using the change_7d proxy from protocols on each chain.
 */
export function computeChainDominance(chains: Chain[]): ChainDominance[] {
  const total = chains.reduce((s, c) => s + (c.tvl ?? 0), 0)
  if (total === 0) return []

  return chains
    .filter((c) => c.tvl && c.tvl > 0)
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
    .slice(0, 20)
    .map((c) => ({
      name: c.name,
      tvl: c.tvl ?? 0,
      share: (c.tvl ?? 0) / total,
      shareChange7d: null, // Would require historical chain TVL data
    }))
}

/**
 * Computes ranked inflow/outflow per chain for the ChainFlowLeaderboard.
 * Derives flow estimates from protocol change_7d × chainTvl.
 */
export function computeChainFlowEntries(
  protocols: Protocol[],
  chains: Chain[]
): ChainFlowEntry[] {
  const chainNetFlow = new Map<string, number>()
  const chainTvlMap = new Map<string, number>()

  // Build chain TVL from chains array for accurate share computation
  const totalChainTvl = chains.reduce((s, c) => s + (c.tvl ?? 0), 0)
  for (const c of chains) {
    if (c.tvl && c.tvl > 0) {
      chainTvlMap.set(c.name, c.tvl)
    }
  }

  // Estimate per-chain net flow from protocol data
  for (const p of protocols) {
    if (!p.chainTvls || !p.change_7d) continue
    const c7d = p.change_7d / 100
    if (!Number.isFinite(c7d)) continue

    for (const [chain, tvlRaw] of Object.entries(p.chainTvls)) {
      const tvlNum = extractTvlNumber(tvlRaw)
      if (tvlNum <= 0) continue
      const flow = c7d * tvlNum
      if (!Number.isFinite(flow)) continue
      chainNetFlow.set(chain, (chainNetFlow.get(chain) ?? 0) + flow)
    }
  }

  // Build entries for all chains that appear in the chains list
  const entries: ChainFlowEntry[] = chains
    .filter((c) => c.tvl && c.tvl > 0)
    .map((c) => {
      const tvl = c.tvl ?? 0
      const netFlow7d = chainNetFlow.get(c.name) ?? 0
      const share = totalChainTvl > 0 ? tvl / totalChainTvl : 0

      // Estimate share change: (flow / totalTVL) in percentage points
      const shareChange7d =
        totalChainTvl > 0 ? (netFlow7d / totalChainTvl) * 100 : null

      return {
        chain: c.name,
        tvl,
        netFlow7d,
        shareChange7d,
        direction: (
          netFlow7d > tvl * 0.005 ? 'inflow'
          : netFlow7d < -(tvl * 0.005) ? 'outflow'
          : 'neutral'
        ) as ChainFlowEntry['direction'],
      }
    })
    .sort((a, b) => Math.abs(b.netFlow7d) - Math.abs(a.netFlow7d))
    .slice(0, 20)

  return entries
}
