import { NextResponse } from 'next/server'
import { fetchProtocols } from '@/lib/api/protocols'
import { fetchChains } from '@/lib/api/chains'
import { fetchStablecoins } from '@/lib/api/stablecoins'
import { computeGrowthMetrics } from '@/lib/analytics/growthMetrics'
import {
  computeChainFlows,
  computeChainDominance,
  computeChainFlowEntries,
} from '@/lib/analytics/liquidityFlow'
import { computeStablecoinMetrics } from '@/lib/analytics/stablecoinAnalytics'
import { generateAlerts } from '@/lib/analytics/alertEngine'
import { generateInsights } from '@/lib/analytics/insightGenerator'
import { computeSentiment } from '@/lib/analytics/sentimentCalc'
import { computeCategoryRotation } from '@/lib/analytics/categoryRotation'
import type {
  AnalyticsPayload,
  TVLPoint,
  GrowthLeaderboardEntry,
  DexOverviewSummary,
} from '@/types/analytics'

export const dynamic = 'force-dynamic'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches global DEX overview summary directly from DeFiLlama.
 * NOTE: Calls DeFiLlama directly (not /api/dex-overview) to avoid
 * self-referential HTTP requests which deadlock in Next.js dev mode.
 */
async function fetchDexOverview(): Promise<DexOverviewSummary | null> {
  try {
    const res = await fetch(
      'https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=false',
      { signal: AbortSignal.timeout(12_000) }
    )
    if (!res.ok) return null
    const raw = await res.json()

    const total24h = typeof raw?.total24h === 'number' ? raw.total24h : 0
    const total7d = typeof raw?.total7d === 'number' ? raw.total7d : 0

    const recentVolumeChart: TVLPoint[] = Array.isArray(raw?.totalDataChart)
      ? (raw.totalDataChart as unknown[])
          .filter(
            (entry): entry is [number, number] =>
              Array.isArray(entry) &&
              entry.length >= 2 &&
              typeof entry[0] === 'number' &&
              typeof entry[1] === 'number' &&
              Number.isFinite(entry[1])
          )
          .slice(-30)
          .map(([date, tvl]) => ({ date, tvl }))
      : []

    return { total24h, total7d, recentVolumeChart }
  } catch {
    return null
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  // Fetch all external sources in parallel — a single failed source should NOT kill the route.
  const [protocols, chains, stablecoins, dexOverview] = await Promise.all([
    fetchProtocols().catch((e) => {
      console.warn('[analytics] protocols fetch failed — continuing with empty dataset', e)
      return []
    }),
    fetchChains().catch((e) => {
      console.warn('[analytics] chains fetch failed — continuing with empty dataset', e)
      return []
    }),
    fetchStablecoins().catch((e) => {
      console.warn('[analytics] stablecoins fetch failed — continuing with empty dataset', e)
      return []
    }),
    fetchDexOverview().catch(() => null),
  ])

  // ── Core analytics computations ────────────────────────────────────────────
  // NOTE: protocolHistories is intentionally omitted — batchFetchProtocolHistories
  // was removed because it issued 50 serial HTTP requests to DeFiLlama, causing
  // the route to time out. computeGrowthMetrics falls back to change_7d * 4 for
  // tvl30dChange (hasRealHistory: false). Full 90-day history is fetched on-demand
  // via /api/protocol-history/[slug] (client-side SWR) when a row is clicked in
  // the GrowthLeaderboard modal.

  const growthMetrics = await Promise.resolve()
    .then(() => computeGrowthMetrics(protocols))
    .catch((e) => {
      console.warn('[analytics] computeGrowthMetrics failed', e)
      return {}
    })

  const flows = await Promise.resolve()
    .then(() => computeChainFlows(protocols, chains))
    .catch((e) => {
      console.warn('[analytics] computeChainFlows failed', e)
      return []
    })

  const chainDominance = await Promise.resolve()
    .then(() => computeChainDominance(chains))
    .catch((e) => {
      console.warn('[analytics] computeChainDominance failed', e)
      return []
    })

  const chainFlows = await Promise.resolve()
    .then(() => computeChainFlowEntries(protocols, chains))
    .catch((e) => {
      console.warn('[analytics] computeChainFlowEntries failed', e)
      return []
    })

  const categoryRotation = await Promise.resolve()
    .then(() => computeCategoryRotation(protocols))
    .catch((e) => {
      console.warn('[analytics] computeCategoryRotation failed', e)
      return []
    })

  const stablecoinSummary = await Promise.resolve()
    .then(() => computeStablecoinMetrics(stablecoins))
    .catch((e) => {
      console.warn('[analytics] computeStablecoinMetrics failed', e)
      return null
    })

  const alerts = await Promise.resolve()
    .then(() => generateAlerts(protocols, chains, stablecoins, growthMetrics))
    .catch((e) => {
      console.warn('[analytics] generateAlerts failed', e)
      return []
    })

  const protocolNames = protocols.length > 0
    ? Object.fromEntries(protocols.map((p) => [p.slug, p.name]))
    : {}

  const insights = await Promise.resolve()
    .then(() => generateInsights(growthMetrics, flows, stablecoinSummary, protocolNames, dexOverview))
    .catch((e) => {
      console.warn('[analytics] generateInsights failed', e)
      return []
    })

  const sentiment = await Promise.resolve()
    .then(() => computeSentiment(growthMetrics, flows, stablecoinSummary))
    .catch((e) => {
      console.warn('[analytics] computeSentiment failed', e)
      return null
    })

  // ── Growth leaderboard (top 15 by 30d change) ──────────────────────────────
  // Filters applied before sorting:
  //   1. TVL >= $1M  — excludes micro-protocols whose % gains are analytically
  //      meaningless (e.g. $1 → $185 = +18,400%)
  //   2. |30d change| <= 5000%  — excludes near-zero-start protocols that
  //      produce astronomical percentages with no real signal
  //   3. tvl30dChange !== null
  // sparklinePoints is always [] here — history is fetched on-demand in the modal
  // via /api/protocol-history/[slug] (SWR). Sparkline.tsx renders a muted
  // placeholder when data.length < 2.
  const MIN_TVL_USD = 1_000_000  // $1M floor
  const MAX_PCT_NOISE = 5_000    // ±5000% ceiling to filter near-zero noise

  const growthLeaderboard: GrowthLeaderboardEntry[] = Object.values(growthMetrics)
    .filter((m) => {
      if (m.tvl30dChange === null) return false
      if (Math.abs(m.tvl30dChange) > MAX_PCT_NOISE) return false
      const proto = protocols.find((p) => p.slug === m.slug)
      if ((proto?.tvl ?? 0) < MIN_TVL_USD) return false
      return true
    })
    .sort((a, b) => (b.tvl30dChange ?? 0) - (a.tvl30dChange ?? 0))
    .slice(0, 15)
    .map((m) => {
      const proto = protocols.find((p) => p.slug === m.slug)
      return {
        slug: m.slug,
        name: proto?.name ?? m.slug,
        logo: proto?.logo ?? null,
        category: proto?.category ?? 'Unknown',
        tvl: proto?.tvl ?? 0,
        change7d: m.tvl7dChange,
        change30d: m.tvl30dChange,
        hasRealHistory: m.hasRealHistory,
        sparklinePoints: [],
      }
    })

  // ── Assemble payload ───────────────────────────────────────────────────────

  const payload: AnalyticsPayload = {
    growthMetrics,
    growthLeaderboard,
    flows,
    chainDominance,
    chainFlows,
    categoryRotation,
    stablecoinSummary,
    alerts,
    insights,
    sentiment,
    dexOverview,
    generatedAt: Date.now(),
  }

  return NextResponse.json(payload)
}
