'use client'

import dynamic from 'next/dynamic'
import { useMemo, useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { GlobalMetricsBar } from '@/components/metrics/GlobalMetricsBar'
import { IntelligenceStrip } from '@/components/metrics/IntelligenceStrip'
import { ProtocolPanel } from '@/components/popup/ProtocolPanel'
import { YieldPoolPanel } from '@/components/popup/YieldPoolPanel'
import { YieldOpportunities } from '@/components/yields/YieldOpportunities'
import { ProtocolRanking } from '@/components/ranking/ProtocolRanking'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PoolIntelligenceOverview } from '@/components/yields/PoolIntelligenceOverview'
import { ChainDominancePanel } from '@/components/analytics/ChainDominancePanel'
import { StablecoinAnalysis } from '@/components/analytics/StablecoinAnalysis'
import { AlertPanel } from '@/components/analytics/AlertPanel'
import { InsightCards } from '@/components/analytics/InsightCards'
import { GrowthLeaderboard } from '@/components/analytics/GrowthLeaderboard'
import { ChainFlowLeaderboard } from '@/components/analytics/ChainFlowLeaderboard'
import { LiquidityMigrationCard } from '@/components/analytics/LiquidityMigrationCard'
import { CategoryRotationPanel } from '@/components/analytics/CategoryRotationPanel'
import { InsightsTerminal } from '@/components/analytics/InsightsTerminal'
import { useProtocols } from '@/hooks/useProtocols'
import { useChains } from '@/hooks/useChains'
import { useYields } from '@/hooks/useYields'
import { useAnalytics } from '@/hooks/useAnalytics'
import { formatAPY, formatTVL } from '@/lib/transforms/format'
import { getTop10SafeByAPY } from '@/lib/transforms/normalizeProtocol'
import type { YieldNode } from '@/types/defillama'

// Dynamically import the 3D canvas — must disable SSR
const TopAPYCloud = dynamic(
  () =>
    import('@/components/ecosystem/TopAPYCloud').then(
      (m) => m.TopAPYCloud
    ),
  { ssr: false, loading: () => <CloudPlaceholder /> }
)

function CloudPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500" />
        <p className="text-sm text-white/40">Loading yield cloud…</p>
      </div>
    </div>
  )
}

/** On mobile: show a ranked list of the top-10 safe APY pools instead of 3D canvas */
function MobileAPYFallback({ nodes }: { nodes: YieldNode[] }) {
  return (
    <div className="space-y-1">
      <p className="mb-3 text-xs text-white/30">
        3D view available on desktop · Showing top 10 low-risk pools
      </p>
      {nodes.map((n, i) => (
        <div
          key={`${n.poolSymbol}-${i}`}
          className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
        >
          <span className="w-6 text-right text-xs text-white/30">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{n.poolSymbol}</p>
            <p className="text-xs text-white/40 capitalize">{n.name} · {n.primaryChain}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-emerald-400">{formatAPY(n.apy ?? 0)}</p>
            <p className="text-xs text-white/40">{formatTVL(n.tvlUsd)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export default function HomePage() {
  const { protocols, isLoading: protocolsLoading } = useProtocols()
  const { chains, isLoading: chainsLoading } = useChains()
  const { pools, classifiedPools } = useYields()
  const isMobile = useIsMobile()

  // Analytics — fetches /api/analytics, syncs to Zustand, refreshes every 2min
  useAnalytics()

  // Global metrics
  const metrics = useMemo(() => {
    if (!protocols.length) return null

    const totalTVL = protocols.reduce((sum, p) => sum + (p.tvl ?? 0), 0)
    const protocolCount = protocols.length

    const validPools = pools.filter((p) => p.apy && p.apy < 1000)
    const avgAPY =
      validPools.length > 0
        ? validPools.reduce((sum, p) => sum + p.apy, 0) / validPools.length
        : null

    // Safe avg APY: average APY across low-risk classified pools (apy < 1000 guard)
    const safePools = classifiedPools.filter(
      (p) => p.riskLevel === 'low' && p.apy && p.apy < 1000
    )
    const safeAvgAPY =
      safePools.length > 0
        ? safePools.reduce((sum, p) => sum + p.apy, 0) / safePools.length
        : null

    const topChain =
      chains.length > 0
        ? chains.reduce((best, c) =>
            (c.tvl ?? 0) > (best.tvl ?? 0) ? c : best
          )
        : null

    return {
      totalTVL,
      protocolCount,
      avgAPY,
      safeAvgAPY,
      topChain: topChain ? { name: topChain.name, tvl: topChain.tvl } : null,
    }
  }, [protocols, chains, pools, classifiedPools])

  const loading = protocolsLoading || chainsLoading

  // Top 10 safe APY nodes for mobile fallback
  const top10SafeNodes = useMemo(() => {
    if (!pools.length) return []
    return getTop10SafeByAPY(pools)
  }, [pools])

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      {/* Intelligence Strip — DEX volume, breadth, sentiment */}
      <ErrorBoundary>
        <IntelligenceStrip />
      </ErrorBoundary>

      <main className="mx-auto max-w-screen-2xl space-y-10 pb-20">
        {/* Global Metrics */}
        <section className="pt-8">
          <GlobalMetricsBar
            totalTVL={metrics?.totalTVL ?? null}
            protocolCount={metrics?.protocolCount ?? null}
            avgAPY={metrics?.avgAPY ?? null}
            safeAvgAPY={metrics?.safeAvgAPY ?? null}
            topChain={metrics?.topChain ?? null}
            loading={loading}
          />
        </section>

        {/* ── Active Alerts ── */}
        <ErrorBoundary>
          <AlertPanel />
        </ErrorBoundary>

        {/* ── Market Intelligence (InsightCards grid) ── */}
        <ErrorBoundary>
          <InsightCards />
        </ErrorBoundary>

        {/* ── Pool Intelligence ── */}
        <ErrorBoundary>
          <PoolIntelligenceOverview classifiedPools={classifiedPools} />
        </ErrorBoundary>

        {/* ── Growth Leaderboard (full width) ── */}
        <ErrorBoundary>
          <GrowthLeaderboard />
        </ErrorBoundary>

        {/* ── Two-Column Intelligence Layout ── */}
        <section className="px-4 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Insights Terminal */}
            <ErrorBoundary>
              <InsightsTerminal />
            </ErrorBoundary>

            {/* Right: Chain Capital Flows */}
            <ErrorBoundary>
              <ChainFlowLeaderboard />
            </ErrorBoundary>
          </div>
        </section>

        {/* ── Liquidity Migrations + Category Rotation (two-column) ── */}
        <section className="px-4 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <ErrorBoundary>
              <LiquidityMigrationCard />
            </ErrorBoundary>
            <ErrorBoundary>
              <CategoryRotationPanel />
            </ErrorBoundary>
          </div>
        </section>

        {/* Top-10 Safe APY Cloud */}
        <section className="px-4 sm:px-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Top 10 Safe Yield Pools
              </h2>
              <p className="text-sm text-white/40">
                Low-risk pools · Stablecoin &amp; single-asset · $1M+ TVL · Sustainable APY
              </p>
            </div>
            {!isMobile && (
              <p className="text-xs text-white/30">
                Drag to rotate · Scroll to zoom · Click to explore
              </p>
            )}
          </div>

          {isMobile ? (
            <MobileAPYFallback nodes={top10SafeNodes} />
          ) : (
            <div
              className="relative overflow-hidden rounded-2xl border border-white/10"
              style={{ height: 600 }}
            >
              <ErrorBoundary
                fallback={
                  <div className="flex h-full w-full items-center justify-center">
                    <p className="text-sm text-white/30">
                      3D visualization failed to load
                    </p>
                  </div>
                }
              >
                <TopAPYCloud />
              </ErrorBoundary>
            </div>
          )}
        </section>

        {/* ── Chain Dominance ── */}
        <ErrorBoundary>
          <ChainDominancePanel />
        </ErrorBoundary>

        {/* ── Stablecoin Market ── */}
        <ErrorBoundary>
          <StablecoinAnalysis />
        </ErrorBoundary>

        {/* Yield Opportunities */}
        <ErrorBoundary>
          <YieldOpportunities />
        </ErrorBoundary>

        {/* Protocol Rankings */}
        <ErrorBoundary>
          <ProtocolRanking />
        </ErrorBoundary>
      </main>

      {/* Side panels — only one is ever open at a time (store enforces this) */}
      <ProtocolPanel />
      <YieldPoolPanel />
    </div>
  )
}
