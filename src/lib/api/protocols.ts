import { fetchWithRetry, API_URLS } from './defillama'
import type { Protocol } from '@/types/defillama'

export async function fetchProtocols(): Promise<Protocol[]> {
  return fetchWithRetry<Protocol[]>(API_URLS.protocols)
}
