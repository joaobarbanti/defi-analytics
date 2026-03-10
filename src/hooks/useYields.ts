import useSWR from 'swr'
import { useMemo } from 'react'
import type { YieldPool } from '@/types/defillama'
import type { ClassifiedPool } from '@/types/risk'
import { classifyPools } from '@/lib/risk/classifyPool'

// Call DeFiLlama directly from the browser — bypasses the 10s serverless limit
const YIELDS_URL = 'https://yields.llama.fi/pools'

async function fetchYields(url: string): Promise<YieldPool[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Yields fetch failed: ${res.status}`)
  const json = await res.json()
  return json.data ?? []
}

export function useYields() {
  const { data, error, isLoading } = useSWR<YieldPool[]>(
    YIELDS_URL,
    fetchYields,
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
