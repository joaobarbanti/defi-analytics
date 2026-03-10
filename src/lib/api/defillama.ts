// Base DeFiLlama API client with error handling and retries

const DEFILLAMA_BASE = 'https://api.llama.fi'
const YIELDS_BASE = 'https://yields.llama.fi'
const STABLECOINS_BASE = 'https://stablecoins.llama.fi'

export const API_URLS = {
  protocols: `${DEFILLAMA_BASE}/protocols`,
  protocol: (slug: string) => `${DEFILLAMA_BASE}/protocol/${slug}`,
  chains: `${DEFILLAMA_BASE}/v2/chains`,
  yields: `${YIELDS_BASE}/pools`,
  stablecoins: `${STABLECOINS_BASE}/stablecoins`,
} as const

async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return (await response.json()) as T
    } catch (err) {
      lastError = err as Error
      if (i < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, i))
        )
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`)
}

// ─── Protocol TVL history ─────────────────────────────────────────────────────

interface RawTVLEntry {
  date: number
  totalLiquidityUSD: number
}

interface TVLPoint {
  date: number
  tvl: number
}

/**
 * Fetches the last `limit` TVL data points for a protocol directly from
 * DeFiLlama. Used server-side to avoid self-referential HTTP calls.
 */
export async function fetchProtocolTVLHistory(
  slug: string,
  limit = 90,
  timeoutMs = 15_000
): Promise<TVLPoint[]> {
  try {
    const res = await fetch(
      `${DEFILLAMA_BASE}/protocol/${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(timeoutMs) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const rawTvl: RawTVLEntry[] = Array.isArray(data?.tvl) ? data.tvl : []
    return rawTvl
      .filter(
        (e) =>
          typeof e?.date === 'number' &&
          e.date > 0 &&
          typeof e?.totalLiquidityUSD === 'number' &&
          Number.isFinite(e.totalLiquidityUSD) &&
          e.totalLiquidityUSD >= 0
      )
      .slice(-limit)
      .map((e) => ({ date: e.date, tvl: e.totalLiquidityUSD }))
  } catch {
    return []
  }
}

export { fetchWithRetry }
