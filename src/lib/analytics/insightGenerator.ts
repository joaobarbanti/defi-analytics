import type {
  ProtocolGrowthMetrics,
  LiquidityFlow,
  StablecoinSummary,
  InsightCard,
  InsightCategory,
} from '@/types/analytics'

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

function fmtPct(n: number): string {
  return `${n > 0 ? '+' : ''}${fmt(n)}%`
}

/**
 * Generates insight cards from computed analytics data.
 * Returns top insights ranked by signal magnitude.
 *
 * stablecoinSummary may be null if its computation failed; stablecoin
 * insights are simply skipped in that case.
 */
export function generateInsights(
  growthMetrics: Record<string, ProtocolGrowthMetrics>,
  flows: LiquidityFlow[],
  stablecoinSummary: StablecoinSummary | null,
  protocolNames: Record<string, string> // slug → name
): InsightCard[] {
  const insights: InsightCard[] = []
  const now = Date.now()

  function makeId(key: string) {
    return `insight__${key}__${new Date().toISOString().slice(0, 10)}`
  }

  // ── Protocol growth insights ─────────────────────────────────────────────
  const topGrowing = Object.values(growthMetrics)
    .filter((m) => m.tvl7dChange !== null && m.tvl7dChange > 15)
    .sort((a, b) => (b.tvl7dChange ?? 0) - (a.tvl7dChange ?? 0))
    .slice(0, 3)

  for (const m of topGrowing) {
    const name = protocolNames[m.slug] ?? m.slug
    insights.push({
      id: makeId(`growth_${m.slug}`),
      headline: `${name} TVL up ${fmtPct(m.tvl7dChange!)} this week`,
      detail: `Strong capital inflows suggest rising demand for ${name}. Momentum score: ${fmt(m.momentumScore)}.`,
      category: 'protocol',
      linkedSlug: m.slug,
      generatedAt: now,
    })
  }

  // ── Protocol declining insights ──────────────────────────────────────────
  const topDeclining = Object.values(growthMetrics)
    .filter((m) => m.tvl7dChange !== null && m.tvl7dChange < -15)
    .sort((a, b) => (a.tvl7dChange ?? 0) - (b.tvl7dChange ?? 0))
    .slice(0, 2)

  for (const m of topDeclining) {
    const name = protocolNames[m.slug] ?? m.slug
    insights.push({
      id: makeId(`decline_${m.slug}`),
      headline: `${name} TVL down ${fmtPct(m.tvl7dChange!)} this week`,
      detail: `Capital appears to be rotating out of ${name}. Watch for further outflows.`,
      category: 'protocol',
      linkedSlug: m.slug,
      generatedAt: now,
    })
  }

  // ── Liquidity flow insights ──────────────────────────────────────────────
  const largeFlows = flows.filter((f) => f.magnitude === 'large').slice(0, 2)
  for (const flow of largeFlows) {
    insights.push({
      id: makeId(`flow_${flow.id}`),
      headline: `Liquidity migrating from ${flow.sourceChain} → ${flow.destChain}`,
      detail: `Estimated $${(flow.netFlow / 1e9).toFixed(1)}B in capital movement detected. ${flow.destChain} ecosystem gaining TVL share.`,
      category: 'liquidity',
      linkedChain: flow.destChain,
      generatedAt: now,
    })
  }

  const medFlows = flows.filter((f) => f.magnitude === 'medium').slice(0, 2)
  for (const flow of medFlows) {
    insights.push({
      id: makeId(`flow_${flow.id}`),
      headline: `${flow.destChain} attracting capital from ${flow.sourceChain}`,
      detail: `Moderate liquidity shift detected. ${flow.destChain} ecosystem is showing relative strength.`,
      category: 'chain',
      linkedChain: flow.destChain,
      generatedAt: now,
    })
  }

  // ── Stablecoin insights ──────────────────────────────────────────────────
  if (stablecoinSummary != null && stablecoinSummary.totalMarketCap > 0) {
    const totalB = (stablecoinSummary.totalMarketCap / 1e9).toFixed(0)
    insights.push({
      id: makeId('stablecoin_total'),
      headline: `Total stablecoin supply: $${totalB}B`,
      detail: `Stablecoin market represents dry powder available for DeFi deployment. Top asset: ${stablecoinSummary.topAssets[0]?.symbol ?? 'USDT'} (${((stablecoinSummary.topAssets[0]?.dominance ?? 0) * 100).toFixed(0)}% dominance).`,
      category: 'stablecoin',
      generatedAt: now,
    })

    // Dominance shift if USDC gaining on USDT
    const usdt = stablecoinSummary.topAssets.find((a) => a.symbol === 'USDT')
    const usdc = stablecoinSummary.topAssets.find((a) => a.symbol === 'USDC')
    if (usdt && usdc && usdc.dominance > 0.3) {
      insights.push({
        id: makeId('stablecoin_usdc_dominance'),
        headline: `USDC holds ${fmt(usdc.dominance * 100)}% stablecoin dominance`,
        detail: `USDC's share signals preference for regulated, transparent reserves. USDT leads at ${fmt((usdt.dominance ?? 0) * 100)}%.`,
        category: 'stablecoin',
        generatedAt: now,
      })
    }
  }

  // Sort by estimated importance (protocol > liquidity > chain > stablecoin > sentiment)
  const categoryPriority: Record<InsightCategory, number> = {
    protocol: 5,
    liquidity: 4,
    chain: 3,
    stablecoin: 2,
    sentiment: 1,
  }

  return insights
    .sort((a, b) => categoryPriority[b.category] - categoryPriority[a.category])
    .slice(0, 8)
}
