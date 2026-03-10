import { NextResponse } from 'next/server'

export const revalidate = 900 // 15 minutes

export interface DexProtocol {
  name: string
  displayName: string
  total24h: number | null
  total7d: number | null
  totalAllTime: number | null
  change_1d: number | null
  change_7d: number | null
}

export interface DexOverviewData {
  /** Total DEX volume in last 24h (USD) */
  total24h: number
  /** Total DEX volume in last 7d (USD) */
  total7d: number
  /** Global DEX volume time series: [[timestamp_seconds, volume_usd], ...] */
  totalDataChart: [number, number][]
  /** Top DEX protocols by volume */
  protocols: DexProtocol[]
  fetchedAt: number
}

export async function GET() {
  try {
    const res = await fetch(
      'https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=false',
      { signal: AbortSignal.timeout(15_000) }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: `DeFiLlama returned ${res.status}` },
        { status: res.status }
      )
    }

    const raw = await res.json()

    // Extract global totals
    const total24h = typeof raw?.total24h === 'number' ? raw.total24h : 0
    const total7d = typeof raw?.total7d === 'number' ? raw.total7d : 0

    // totalDataChart is an array of [timestamp, volume] pairs
    const totalDataChart: [number, number][] = Array.isArray(raw?.totalDataChart)
      ? (raw.totalDataChart as unknown[])
          .filter(
            (entry): entry is [number, number] =>
              Array.isArray(entry) &&
              entry.length >= 2 &&
              typeof entry[0] === 'number' &&
              typeof entry[1] === 'number' &&
              Number.isFinite(entry[1])
          )
          .slice(-90)
      : []

    // Extract top protocols
    const protocols: DexProtocol[] = Array.isArray(raw?.protocols)
      ? (raw.protocols as Record<string, unknown>[])
          .filter((p) => p && typeof p.total24h === 'number' && (p.total24h as number) > 0)
          .sort((a, b) => ((b.total24h as number) ?? 0) - ((a.total24h as number) ?? 0))
          .slice(0, 20)
          .map((p) => ({
            name: typeof p.name === 'string' ? p.name : '',
            displayName: typeof p.displayName === 'string' ? p.displayName : (typeof p.name === 'string' ? p.name : ''),
            total24h: typeof p.total24h === 'number' ? p.total24h : null,
            total7d: typeof p.total7d === 'number' ? p.total7d : null,
            totalAllTime: typeof p.totalAllTime === 'number' ? p.totalAllTime : null,
            change_1d: typeof p.change_1d === 'number' ? p.change_1d : null,
            change_7d: typeof p.change_7d === 'number' ? p.change_7d : null,
          }))
      : []

    const payload: DexOverviewData = {
      total24h,
      total7d,
      totalDataChart,
      protocols,
      fetchedAt: Date.now(),
    }

    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.warn('[dex-overview] fetch failed:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
