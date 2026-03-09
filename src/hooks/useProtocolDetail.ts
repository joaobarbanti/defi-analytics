import useSWR from 'swr'
import type { ProtocolDetail } from '@/types/defillama'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useProtocolDetail(slug: string | null) {
  const { data, error, isLoading } = useSWR<ProtocolDetail>(
    slug ? `/api/protocol/${slug}` : null,
    fetcher,
    { dedupingInterval: 60_000 }
  )

  return {
    detail: data ?? null,
    isLoading,
    error,
  }
}
