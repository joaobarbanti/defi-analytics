import { fetchWithRetry, API_URLS } from './defillama'
import type { Chain } from '@/types/defillama'

export async function fetchChains(): Promise<Chain[]> {
  return fetchWithRetry<Chain[]>(API_URLS.chains)
}
