import { fetchWithRetry, API_URLS } from './defillama'
import type { YieldPool } from '@/types/defillama'

interface YieldsResponse {
  status: string
  data: YieldPool[]
}

export async function fetchYields(): Promise<YieldPool[]> {
  try {
    const res = await fetchWithRetry<YieldsResponse>(API_URLS.yields)
    return res.data ?? []
  } catch {
    // Yields endpoint may be rate-limited or paywalled — degrade gracefully
    return []
  }
}
