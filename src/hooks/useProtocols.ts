import useSWR from 'swr'
import type { Protocol } from '@/types/defillama'

// Call DeFiLlama directly from the browser — bypasses the 10s serverless limit
const PROTOCOLS_URL = 'https://api.llama.fi/protocols'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useProtocols() {
  const { data, error, isLoading } = useSWR<Protocol[]>(
    PROTOCOLS_URL,
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 }
  )

  return {
    protocols: data ?? [],
    isLoading,
    error,
  }
}
