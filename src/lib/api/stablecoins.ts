import { fetchWithRetry, API_URLS } from './defillama'
import type { Stablecoin } from '@/types/defillama'

interface StablecoinsResponse {
  peggedAssets: Stablecoin[]
}

export async function fetchStablecoins(): Promise<Stablecoin[]> {
  const res = await fetchWithRetry<StablecoinsResponse>(API_URLS.stablecoins)
  return res.peggedAssets ?? []
}
