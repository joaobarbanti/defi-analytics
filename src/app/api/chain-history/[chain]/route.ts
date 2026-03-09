// GET /api/chain-history/[chain]
// Proxies DeFiLlama /v2/historicalChainTvl/{chain} and returns
// the last 30 data points for sparkline/chart rendering.

import { NextRequest, NextResponse } from 'next/server'

interface DllamaPoint {
  date: number
  tvl: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params

  if (!chain || typeof chain !== 'string') {
    return NextResponse.json({ error: 'Missing chain param' }, { status: 400 })
  }

  try {
    const url = `https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(chain)}`
    const res = await fetch(url, {
      next: { revalidate: 300 }, // cache 5 minutes
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `DeFiLlama returned ${res.status}` },
        { status: res.status }
      )
    }

    const raw: unknown = await res.json()

    // DeFiLlama returns an array of { date, tvl } points.
    // Guard against unexpected shapes (object with tvlList, empty, etc.)
    const dataArray: DllamaPoint[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown>)?.tvlList)
        ? ((raw as Record<string, unknown>).tvlList as DllamaPoint[])
        : []

    // Return last 30 data points (≈ 30 days), filtering out non-finite values
    const points = dataArray
      .slice(-30)
      .map((p) => ({
        date: typeof p.date === 'number' ? p.date : 0,
        tvl: typeof p.tvl === 'number' && Number.isFinite(p.tvl) ? p.tvl : 0,
      }))
      .filter((p) => p.date > 0)

    return NextResponse.json({ chain, points })
  } catch (err) {
    console.error(`[chain-history] fetch error for ${chain}:`, err)
    return NextResponse.json(
      { error: 'Failed to fetch chain TVL history' },
      { status: 500 }
    )
  }
}
