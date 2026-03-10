import type {
  ProtocolGrowthMetrics,
  LiquidityFlow,
  StablecoinSummary,
  InsightCard,
  InsightCategory,
  DexOverviewSummary,
} from '@/types/analytics'
import { formatFlow, formatPct } from '@/lib/transforms/format'

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

/**
 * Generates insight cards from computed analytics data.
 * Returns top insights ranked by signal magnitude.
 *
 * stablecoinSummary and dexOverview may be null if their computation failed;
 * those insight families are simply skipped in that case.
 */
export function generateInsights(
  growthMetrics: Record<string, ProtocolGrowthMetrics>,
  flows: LiquidityFlow[],
  stablecoinSummary: StablecoinSummary | null,
  protocolNames: Record<string, string>, // slug → name
  dexOverview: DexOverviewSummary | null
): InsightCard[] {
  const insights: InsightCard[] = []
  const now = Date.now()

  function makeId(key: string) {
    return `insight__${key}__${new Date().toISOString().slice(0, 10)}`
  }

  // ── 1. Protocol growth insights ──────────────────────────────────────────────
  const topGrowing = Object.values(growthMetrics)
    .filter((m) => m.tvl7dChange !== null && m.tvl7dChange > 15)
    .sort((a, b) => (b.tvl7dChange ?? 0) - (a.tvl7dChange ?? 0))
    .slice(0, 3)

  for (const m of topGrowing) {
    const name = protocolNames[m.slug] ?? m.slug
    insights.push({
      id: makeId(`growth_${m.slug}`),
      headline: `${name} TVL up ${formatPct(m.tvl7dChange!)} this week`,
      detail: `Strong capital inflows suggest rising demand for ${name}. Momentum score: ${fmt(m.momentumScore)}.`,
      category: 'protocol',
      linkedSlug: m.slug,
      generatedAt: now,
    })
  }

  // ── 2. Protocol declining insights ──────────────────────────────────────────
  const topDeclining = Object.values(growthMetrics)
    .filter((m) => m.tvl7dChange !== null && m.tvl7dChange < -15)
    .sort((a, b) => (a.tvl7dChange ?? 0) - (b.tvl7dChange ?? 0))
    .slice(0, 2)

  for (const m of topDeclining) {
    const name = protocolNames[m.slug] ?? m.slug
    insights.push({
      id: makeId(`decline_${m.slug}`),
      headline: `${name} TVL down ${formatPct(m.tvl7dChange!)} this week`,
      detail: `Capital appears to be rotating out of ${name}. Watch for further outflows.`,
      category: 'protocol',
      linkedSlug: m.slug,
      generatedAt: now,
    })
  }

  // ── 3. 30-day sustained growth (real history only) ───────────────────────────
  const sustained30d = Object.values(growthMetrics)
    .filter((m) => m.hasRealHistory && m.tvl30dChange !== null && m.tvl30dChange > 40)
    .sort((a, b) => (b.tvl30dChange ?? 0) - (a.tvl30dChange ?? 0))
    .slice(0, 2)

  for (const m of sustained30d) {
    const name = protocolNames[m.slug] ?? m.slug
    insights.push({
      id: makeId(`sustained_${m.slug}`),
      headline: `${name} up ${formatPct(m.tvl30dChange!)} over 30 days`,
      detail: `Sustained month-long growth signals structural demand. Protocol trend: ${m.trendLabel}.`,
      category: 'protocol',
      linkedSlug: m.slug,
      generatedAt: now,
    })
  }

  // ── 4. Liquidity flow insights ───────────────────────────────────────────────
  const largeFlows = flows.filter((f) => f.magnitude === 'large').slice(0, 2)
  for (const flow of largeFlows) {
    insights.push({
      id: makeId(`flow_${flow.id}`),
      headline: `Liquidity migrating from ${flow.sourceChain} → ${flow.destChain}`,
      detail: `Estimated ${formatFlow(flow.netFlow, { signed: false })} in capital movement detected. ${flow.destChain} ecosystem gaining TVL share.`,
      category: 'liquidity',
      linkedChain: flow.destChain,
      generatedAt: now,
    })
  }

  const medFlows = flows.filter((f) => f.magnitude === 'medium').slice(0, 2)
  for (const flow of medFlows) {
    insights.push({
      id: makeId(`flow_med_${flow.id}`),
      headline: `${flow.destChain} attracting capital from ${flow.sourceChain}`,
      detail: `Moderate liquidity shift detected. ${flow.destChain} ecosystem is showing relative strength.`,
      category: 'chain',
      linkedChain: flow.destChain,
      generatedAt: now,
    })
  }

  // ── 5. Stablecoin insights ───────────────────────────────────────────────────
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

    // Peg-stress signal: stablecoins trading off-peg
    const offPeg = stablecoinSummary.topAssets.filter(
      (a) => a.price !== null && (a.price < 0.995 || a.price > 1.005)
    )
    if (offPeg.length > 0) {
      const names = offPeg.map((a) => a.symbol).join(', ')
      insights.push({
        id: makeId('stablecoin_peg_stress'),
        headline: `Peg stress detected: ${names}`,
        detail: `${offPeg.length} stablecoin${offPeg.length > 1 ? 's are' : ' is'} trading off $1.00 peg. Monitor for depegging risk.`,
        category: 'stablecoin',
        generatedAt: now,
      })
    }
  }

  // ── 6. DEX volume insights ───────────────────────────────────────────────────
  if (dexOverview != null) {
    const vol24hB = dexOverview.total24h / 1e9
    const vol7dB = dexOverview.total7d / 1e9
    const avgDailyB = vol7dB / 7

    // 24h volume vs 7d daily avg (spike or slump detection)
    if (avgDailyB > 0) {
      const ratio = vol24hB / avgDailyB
      if (ratio > 1.5) {
        insights.push({
          id: makeId('dex_volume_spike'),
          headline: `DEX volume spike: $${vol24hB.toFixed(1)}B in 24h`,
          detail: `24-hour volume is ${fmt(ratio, 1)}× the 7-day daily average ($${avgDailyB.toFixed(1)}B). Elevated trading activity may signal directional positioning.`,
          category: 'liquidity',
          generatedAt: now,
        })
      } else if (ratio < 0.5) {
        insights.push({
          id: makeId('dex_volume_slump'),
          headline: `DEX volume subdued: $${vol24hB.toFixed(1)}B in 24h`,
          detail: `24-hour volume is ${fmt(ratio * 100, 0)}% of the 7-day daily average. Low volume may indicate range-bound markets or reduced participant activity.`,
          category: 'liquidity',
          generatedAt: now,
        })
      } else {
        insights.push({
          id: makeId('dex_volume_normal'),
          headline: `DEX volume: $${vol24hB.toFixed(1)}B (24h) · $${vol7dB.toFixed(1)}B (7d)`,
          detail: `On-chain trading activity is within normal range. 7-day total ${formatFlow(dexOverview.total7d, { signed: false })} across major DEX venues.`,
          category: 'liquidity',
          generatedAt: now,
        })
      }
    }
  }

  // ── 7. Momentum divergence (high momentum but small TVL) ─────────────────────
  const highMomentum = Object.values(growthMetrics)
    .filter(
      (m) =>
        m.momentumScore > 80 &&
        m.tvl7dChange !== null &&
        m.tvl7dChange > 20
    )
    .sort((a, b) => b.momentumScore - a.momentumScore)
    .slice(0, 2)

  for (const m of highMomentum) {
    const name = protocolNames[m.slug] ?? m.slug
    // Avoid duplicating with growth insights
    const alreadyAdded = insights.some((i) => i.linkedSlug === m.slug)
    if (!alreadyAdded) {
      insights.push({
        id: makeId('momentum_' + m.slug),
        headline: m.slug + ' showing strong momentum (score: ' + fmt(m.momentumScore) + ')',
        detail: 'Week-on-week change: ' + formatPct(m.tvl7dChange) + '. Trend classified as "' + m.trendLabel + '". Watch for continuation.',
        category: 'protocol',
        linkedSlug: m.slug,
        generatedAt: now,
      })
    }
  }

  // collapse alert
  const collapsing = Object.values(growthMetrics)
    .filter((m) => m.trendLabel === 'Collapsing')
    .sort((a, b) => (a.tvl7dChange ?? 0) - (b.tvl7dChange ?? 0))
    .slice(0, 1)

  for (const m of collapsing) {
    const name = protocolNames[m.slug] ?? m.slug
    insights.push({
      id: makeId('collapse_' + m.slug),
      headline: 'WARNING: ' + name + ' in collapse pattern',
      detail: 'TVL down ' + formatPct(m.tvl7dChange) + ' in 7 days with sustained decline. Possible protocol risk or mass exit.',
      category: 'protocol',
      linkedSlug: m.slug,
      generatedAt: now,
    })
  }

  // sentiment summary
  const metricsArr = Object.values(growthMetrics)
  if (metricsArr.length > 0) {
    const gainers = metricsArr.filter((m) => (m.tvl7dChange ?? 0) > 0).length
    const losers = metricsArr.filter((m) => (m.tvl7dChange ?? 0) < 0).length
    const total = metricsArr.length
    const gainPct = (gainers / total) * 100
    if (gainPct > 60) {
      insights.push({
        id: makeId('breadth_positive'),
        headline: gainPct.toFixed(0) + '% of protocols growing this week',
        detail: 'Broad-based capital inflow across ' + gainers + ' of ' + total + ' tracked protocols. Market breadth is positive.',
        category: 'sentiment',
        generatedAt: now,
      })
    } else if (gainPct < 35) {
      insights.push({
        id: makeId('breadth_negative'),
        headline: 'Only ' + gainPct.toFixed(0) + '% of protocols growing this week',
        detail: losers + ' of ' + total + ' tracked protocols saw capital outflows. Broad-based risk-off rotation in progress.',
        category: 'sentiment',
        generatedAt: now,
      })
    }
  }

  const categoryPriority = {
    protocol: 5,
    liquidity: 4,
    chain: 3,
    stablecoin: 2,
    sentiment: 1,
  }

  const collapseInsights = insights.filter((i) => i.headline.startsWith('WARNING:'))
  const rest = insights
    .filter((i) => !i.headline.startsWith('WARNING:'))
    .sort((a, b) => categoryPriority[b.category] - categoryPriority[a.category])

  return [...collapseInsights, ...rest].slice(0, 12)
}
