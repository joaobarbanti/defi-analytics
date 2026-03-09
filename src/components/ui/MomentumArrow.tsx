'use client'

interface MomentumArrowProps {
  score: number       // -100..+200
  rankChange?: number // positive = moved up
}

/**
 * Displays a directional arrow and momentum score chip.
 * Green arrows for positive momentum, red for negative, gray for flat.
 */
export function MomentumArrow({ score, rankChange = 0 }: MomentumArrowProps) {
  const isUp = score > 5
  const isDown = score < -5

  const arrow = isUp ? '▲' : isDown ? '▼' : '—'
  const color = isUp
    ? 'text-emerald-400'
    : isDown
    ? 'text-red-400'
    : 'text-white/30'

  const rankBadge =
    rankChange !== 0 ? (
      <span
        className={`text-[10px] leading-none ${
          rankChange > 0 ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {rankChange > 0 ? `+${rankChange}` : rankChange}
      </span>
    ) : null

  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={`text-xs font-bold leading-none ${color}`}>{arrow}</span>
      {rankBadge}
    </span>
  )
}
