import type { Protocol, Chain, Stablecoin } from '@/types/defillama'
import type {
  MarketAlert,
  AlertSeverity,
  AlertType,
  ProtocolGrowthMetrics,
} from '@/types/analytics'

interface PreviousState {
  top20Slugs: string[]
  totalTVL: number
  chainShares: Record<string, number>
}

// In-memory previous state for diff-based alerts
let prevState: PreviousState | null = null

function makeId(type: AlertType, key: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${type}__${key}__${date}`
}

/**
 * Generates market alerts by comparing current data against a previous snapshot.
 * Deduplicates by date-scoped ID so the same condition doesn't re-fire all day.
 */
export function generateAlerts(
  protocols: Protocol[],
  chains: Chain[],
  stablecoins: Stablecoin[],
  growthMetrics: Record<string, ProtocolGrowthMetrics>
): MarketAlert[] {
  const alerts: MarketAlert[] = []
  const now = Date.now()

  const sorted = [...protocols]
    .filter((p) => p.tvl && p.tvl > 0)
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))

  const currentTop20 = sorted.slice(0, 20).map((p) => p.slug)
  const totalTVL = sorted.reduce((s, p) => s + (p.tvl ?? 0), 0)

  const chainTotals = computeChainTotals(protocols)
  const currentChainShares: Record<string, number> = {}
  for (const [chain, tvl] of Object.entries(chainTotals)) {
    currentChainShares[chain] = totalTVL > 0 ? tvl / totalTVL : 0
  }

  // ── Protocol growth / decline alerts ─────────────────────────────────────
  for (const p of sorted.slice(0, 100)) {
    const metrics = growthMetrics[p.slug]
    if (!metrics) continue
    const c7d = metrics.tvl7dChange

    if (c7d !== null && c7d >= 10) {
      alerts.push({
        id: makeId('protocol_growth', p.slug),
        type: 'protocol_growth',
        severity: c7d >= 30 ? 'critical' : 'warning',
        title: `${p.name} TVL surging`,
        body: `${p.name} TVL grew ${c7d.toFixed(1)}% in 7 days — strong capital inflow signal.`,
        protocolSlug: p.slug,
        timestamp: now,
      })
    } else if (c7d !== null && c7d <= -10) {
      alerts.push({
        id: makeId('protocol_decline', p.slug),
        type: 'protocol_decline',
        severity: c7d <= -30 ? 'critical' : 'warning',
        title: `${p.name} TVL declining`,
        body: `${p.name} TVL dropped ${Math.abs(c7d).toFixed(1)}% in 7 days — potential liquidity exit.`,
        protocolSlug: p.slug,
        timestamp: now,
      })
    }
  }

  // ── New protocol entering Top 20 ─────────────────────────────────────────
  if (prevState) {
    for (const slug of currentTop20) {
      if (!prevState.top20Slugs.includes(slug)) {
        const p = protocols.find((pr) => pr.slug === slug)
        if (p) {
          alerts.push({
            id: makeId('top20_entry', slug),
            type: 'top20_entry',
            severity: 'info',
            title: `${p.name} entered Top 20`,
            body: `${p.name} is now a top-20 DeFi protocol by TVL with ${formatBillions(p.tvl)}.`,
            protocolSlug: slug,
            timestamp: now,
          })
        }
      }
    }

    // ── Chain dominance shift ──────────────────────────────────────────────
    for (const [chain, share] of Object.entries(currentChainShares)) {
      const prevShare = prevState.chainShares[chain] ?? 0
      const delta = share - prevShare
      if (Math.abs(delta) >= 0.02) {
        alerts.push({
          id: makeId('chain_dominance_shift', chain),
          type: 'chain_dominance_shift',
          severity: Math.abs(delta) >= 0.05 ? 'warning' : 'info',
          title: `${chain} dominance ${delta > 0 ? 'rising' : 'falling'}`,
          body: `${chain} TVL share ${delta > 0 ? 'increased' : 'decreased'} by ${(Math.abs(delta) * 100).toFixed(1)} percentage points.`,
          chain,
          timestamp: now,
        })
      }
    }
  }

  // Update state snapshot
  prevState = {
    top20Slugs: currentTop20,
    totalTVL,
    chainShares: currentChainShares,
  }

  // Deduplicate by ID, keep highest severity per ID
  const seen = new Map<string, MarketAlert>()
  for (const alert of alerts) {
    const existing = seen.get(alert.id)
    if (!existing || severityRank(alert.severity) > severityRank(existing.severity)) {
      seen.set(alert.id, alert)
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity)
  )
}

function severityRank(s: AlertSeverity): number {
  return s === 'critical' ? 3 : s === 'warning' ? 2 : 1
}

function computeChainTotals(protocols: Protocol[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const p of protocols) {
    for (const [chain, tvl] of Object.entries(p.chainTvls ?? {})) {
      totals[chain] = (totals[chain] ?? 0) + tvl
    }
  }
  return totals
}

function formatBillions(tvl: number | null): string {
  if (!tvl) return '$0'
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(0)}M`
  return `$${tvl.toFixed(0)}`
}
