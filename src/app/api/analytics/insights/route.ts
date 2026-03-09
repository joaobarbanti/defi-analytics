import { NextResponse } from 'next/server'
import { fetchProtocols } from '@/lib/api/protocols'
import { fetchChains } from '@/lib/api/chains'
import { fetchStablecoins } from '@/lib/api/stablecoins'
import { computeGrowthMetrics } from '@/lib/analytics/growthMetrics'
import { computeChainFlows } from '@/lib/analytics/liquidityFlow'
import { computeStablecoinMetrics } from '@/lib/analytics/stablecoinAnalytics'
import { generateInsights } from '@/lib/analytics/insightGenerator'

export const revalidate = 120

export async function GET() {
  try {
    const [protocols, chains, stablecoins] = await Promise.all([
      fetchProtocols(),
      fetchChains(),
      fetchStablecoins(),
    ])

    const growthMetrics = computeGrowthMetrics(protocols)
    const flows = computeChainFlows(protocols, chains)
    const stablecoinSummary = computeStablecoinMetrics(stablecoins)
    const protocolNames = Object.fromEntries(
      protocols.map((p) => [p.slug, p.name])
    )
    const insights = generateInsights(
      growthMetrics,
      flows,
      stablecoinSummary,
      protocolNames
    )

    return NextResponse.json({ insights, generatedAt: Date.now() })
  } catch (err) {
    console.error('[analytics/insights] Failed to generate insights:', err)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
