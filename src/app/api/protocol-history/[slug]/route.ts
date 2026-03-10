import { NextResponse } from 'next/server'

export const revalidate = 3600 // 1 hour — protocol histories change slowly

interface RawTVLEntry {
  date: number
  totalLiquidityUSD: number
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `DeFiLlama returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    // DeFiLlama protocol detail response shape:
    // { ..., tvl: [ { date: number, totalLiquidityUSD: number }, ... ] }
    const rawTvl: RawTVLEntry[] = Array.isArray(data?.tvl) ? data.tvl : []

    // Filter invalid entries and return last 90 data points
    const points = rawTvl
      .filter(
        (entry) =>
          typeof entry?.date === 'number' &&
          entry.date > 0 &&
          typeof entry?.totalLiquidityUSD === 'number' &&
          Number.isFinite(entry.totalLiquidityUSD) &&
          entry.totalLiquidityUSD >= 0
      )
      .slice(-90)
      .map((entry) => ({
        date: entry.date,
        tvl: entry.totalLiquidityUSD,
      }))

    return NextResponse.json({ slug, points })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.warn(`[protocol-history] ${slug} — fetch failed:`, message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
