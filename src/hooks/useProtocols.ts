import useSWR from 'swr'
import type { Protocol } from '@/types/defillama'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useProtocols() {
  const { data, error, isLoading } = useSWR<Protocol[]>(
    '/api/protocols',
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 }
  )

  return {
    protocols: data ?? [],
    isLoading,
    error,
  }
}
