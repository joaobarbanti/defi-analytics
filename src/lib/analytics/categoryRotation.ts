import type { Protocol } from '@/types/defillama'
import type { CategoryRotation } from '@/types/analytics'

/**
 * Aggregates protocol TVL by category and estimates 7-day share shifts.
 * Uses change_7d × tvl as a proxy for TVL flow per protocol.
 */
export function computeCategoryRotation(protocols: Protocol[]): CategoryRotation[] {
  const categoryTvl = new Map<string, number>()
  const categoryFlow7d = new Map<string, number>()

  for (const p of protocols) {
    if (!p.tvl || !p.category) continue
    const cat = p.category

    categoryTvl.set(cat, (categoryTvl.get(cat) ?? 0) + p.tvl)

    // Estimate 7d flow for share-delta computation
    if (p.change_7d !== null && p.change_7d !== undefined) {
      const flow = (p.change_7d / 100) * p.tvl
      if (Number.isFinite(flow)) {
        categoryFlow7d.set(cat, (categoryFlow7d.get(cat) ?? 0) + flow)
      }
    }
  }

  const totalTvl = Array.from(categoryTvl.values()).reduce((s, v) => s + v, 0)
  if (totalTvl === 0) return []

  const entries: CategoryRotation[] = Array.from(categoryTvl.entries())
    .filter(([, tvl]) => tvl > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([category, tvl]) => {
      const share = tvl / totalTvl
      const flow7d = categoryFlow7d.get(category) ?? 0
      // Estimated prior TVL = current - flow
      const priorTvl = tvl - flow7d
      const priorShare = priorTvl > 0 ? priorTvl / (totalTvl - flow7d) : share
      // shareDelta7d in percentage points
      const shareDelta7d = (share - priorShare) * 100

      return {
        category,
        tvl,
        share,
        shareDelta7d: Number.isFinite(shareDelta7d) ? shareDelta7d : 0,
        trend:
          shareDelta7d > 0.3 ? 'gaining'
          : shareDelta7d < -0.3 ? 'losing'
          : 'stable',
      }
    })

  return entries
}
