import useSWR from 'swr'
import type { Chain } from '@/types/defillama'

// Call DeFiLlama directly from the browser — bypasses the 10s serverless limit
const CHAINS_URL = 'https://api.llama.fi/v2/chains'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useChains() {
  const { data, error, isLoading } = useSWR<Chain[]>(
    CHAINS_URL,
    fetcher,
    { refreshInterval: 120_000, dedupingInterval: 60_000 }
  )

  return {
    chains: data ?? [],
    isLoading,
    error,
  }
}
