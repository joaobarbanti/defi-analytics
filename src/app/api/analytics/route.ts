import { NextResponse } from 'next/server'
import { fetchProtocols } from '@/lib/api/protocols'
import { fetchChains } from '@/lib/api/chains'
import { fetchStablecoins } from '@/lib/api/stablecoins'
import { computeGrowthMetrics } from '@/lib/analytics/growthMetrics'
import { computeChainFlows, computeChainDominance } from '@/lib/analytics/liquidityFlow'
import { computeStablecoinMetrics } from '@/lib/analytics/stablecoinAnalytics'
import { generateAlerts } from '@/lib/analytics/alertEngine'
import { generateInsights } from '@/lib/analytics/insightGenerator'
import { computeSentiment } from '@/lib/analytics/sentimentCalc'
import type { AnalyticsPayload } from '@/types/analytics'

// Cache for 2 minutes — revalidate on the server
export const revalidate = 120

export async function GET() {
  // Fetch each source independently — a single failed source should NOT kill the route.
  // Each fetch falls back to an empty array so downstream compute functions always
  // receive a valid (if partial) dataset and the route returns 200 with what it has.
  const protocols = await fetchProtocols().catch((e) => {
    console.warn('[analytics] protocols fetch failed — continuing with empty dataset', e)
    return []
  })
  const chains = await fetchChains().catch((e) => {
    console.warn('[analytics] chains fetch failed — continuing with empty dataset', e)
    return []
  })
  const stablecoins = await fetchStablecoins().catch((e) => {
    console.warn('[analytics] stablecoins fetch failed — continuing with empty dataset', e)
    return []
  })

  // Compute each analytics layer independently — failures return safe fallbacks
  // so the rest of the payload can still be served.
  const growthMetrics = await Promise.resolve().then(() => computeGrowthMetrics(protocols)).catch((e) => {
    console.warn('[analytics] computeGrowthMetrics failed', e)
    return {}
  })

  const flows = await Promise.resolve().then(() => computeChainFlows(protocols, chains)).catch((e) => {
    console.warn('[analytics] computeChainFlows failed', e)
    return []
  })

  const chainDominance = await Promise.resolve().then(() => computeChainDominance(chains)).catch((e) => {
    console.warn('[analytics] computeChainDominance failed', e)
    return []
  })

  const stablecoinSummary = await Promise.resolve().then(() => computeStablecoinMetrics(stablecoins)).catch((e) => {
    console.warn('[analytics] computeStablecoinMetrics failed', e)
    return null
  })

  const alerts = await Promise.resolve().then(() => generateAlerts(protocols, chains, stablecoins, growthMetrics)).catch((e) => {
    console.warn('[analytics] generateAlerts failed', e)
    return []
  })

  const protocolNames = protocols.length > 0
    ? Object.fromEntries(protocols.map((p) => [p.slug, p.name]))
    : {}

  const insights = await Promise.resolve().then(() => generateInsights(growthMetrics, flows, stablecoinSummary, protocolNames)).catch((e) => {
    console.warn('[analytics] generateInsights failed', e)
    return []
  })

  const sentiment = await Promise.resolve().then(() => computeSentiment(growthMetrics, flows, stablecoinSummary)).catch((e) => {
    console.warn('[analytics] computeSentiment failed', e)
    return null
  })

  const payload: AnalyticsPayload = {
    growthMetrics,
    flows,
    chainDominance,
    stablecoinSummary,
    alerts,
    insights,
    sentiment,
    generatedAt: Date.now(),
  }

  return NextResponse.json(payload)
}
