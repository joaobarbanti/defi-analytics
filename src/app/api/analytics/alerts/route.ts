import { NextResponse } from 'next/server'
import { fetchProtocols } from '@/lib/api/protocols'
import { fetchChains } from '@/lib/api/chains'
import { fetchStablecoins } from '@/lib/api/stablecoins'
import { computeGrowthMetrics } from '@/lib/analytics/growthMetrics'
import { generateAlerts } from '@/lib/analytics/alertEngine'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [protocols, chains, stablecoins] = await Promise.all([
      fetchProtocols(),
      fetchChains(),
      fetchStablecoins(),
    ])

    const growthMetrics = computeGrowthMetrics(protocols)
    const alerts = generateAlerts(protocols, chains, stablecoins, growthMetrics)

    return NextResponse.json({ alerts, generatedAt: Date.now() })
  } catch (err) {
    console.error('[analytics/alerts] Failed to generate alerts:', err)
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    )
  }
}
