import useSWR from 'swr'
import { useEffect } from 'react'
import { useDefiStore } from '@/store/defi'
import type { AnalyticsPayload } from '@/types/analytics'

const REFRESH_INTERVAL = 2 * 60 * 1000 // 2 minutes

async function fetchAnalytics(url: string): Promise<AnalyticsPayload> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Analytics fetch failed')
  return res.json()
}

/**
 * Fetches the full analytics payload and syncs it into Zustand store.
 * Also initialises dismissed alert IDs from localStorage on mount.
 */
export function useAnalytics() {
  const { setAnalytics, loadDismissedAlerts } = useDefiStore()

  // Load dismissed alerts from localStorage once on mount
  useEffect(() => {
    loadDismissedAlerts()
  }, [loadDismissedAlerts])

  const { data, error, isLoading } = useSWR<AnalyticsPayload>(
    '/api/analytics',
    fetchAnalytics,
    {
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      // Keep the previous payload visible while a background revalidation is
      // in flight — prevents the UI from blinking to a loading state every 2 min.
      keepPreviousData: true,
    }
  )

  // Sync latest payload into Zustand whenever it changes
  useEffect(() => {
    if (data) setAnalytics(data)
  }, [data, setAnalytics])

  return {
    analytics: data ?? null,
    isLoading,
    error,
  }
}
