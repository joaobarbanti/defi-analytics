import useSWR from 'swr'
import { useMemo } from 'react'
import type { YieldPool } from '@/types/defillama'
import type { ClassifiedPool } from '@/types/risk'
import { classifyPools } from '@/lib/risk/classifyPool'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useYields() {
  const { data, error, isLoading } = useSWR<YieldPool[]>(
    '/api/yields',
    fetcher,
    { refreshInterval: 120_000, dedupingInterval: 60_000 }
  )

  const pools = data ?? []

  // Memoised classification — only re-runs when raw pool data changes
  const classifiedPools: ClassifiedPool[] = useMemo(() => {
    if (!pools.length) return []
    return classifyPools(pools)
  }, [pools])

  return {
    pools,
    classifiedPools,
    isLoading,
    error,
  }
}
