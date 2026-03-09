import useSWR from 'swr'
import type { Chain } from '@/types/defillama'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useChains() {
  const { data, error, isLoading } = useSWR<Chain[]>(
    '/api/chains',
    fetcher,
    { refreshInterval: 120_000, dedupingInterval: 60_000 }
  )

  return {
    chains: data ?? [],
    isLoading,
    error,
  }
}
