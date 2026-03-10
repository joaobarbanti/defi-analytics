'use client'

import { Sparkline } from '@/components/ui/Sparkline'
import type { TVLPoint } from '@/types/analytics'

interface TvlSparklineProps {
  points: TVLPoint[]
  /** positive change → green, negative → red, null → white/muted */
  change?: number | null
  height?: number
  width?: number
}

/**
 * Sparkline that accepts TVLPoint[] (date + tvl).
 * Picks line color automatically from the direction of change.
 */
export function TvlSparkline({ points, change, height = 32, width = 72 }: TvlSparklineProps) {
  const values = points.map((p) => p.tvl)

  const color =
    change == null
      ? '#94a3b8'
      : change > 0
        ? '#10b981'
        : '#ef4444'

  return <Sparkline data={values} color={color} height={height} width={width} />
}
