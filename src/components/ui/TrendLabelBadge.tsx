'use client'

import type { TrendLabel } from '@/types/analytics'

interface TrendLabelBadgeProps {
  label: TrendLabel
  compact?: boolean
}

const TREND_CONFIG: Record<
  TrendLabel,
  { bg: string; text: string; dot: string; short: string }
> = {
  'Rapid Growth': {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    short: 'Rapid ↑',
  },
  Growing: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    dot: 'bg-green-400',
    short: 'Growing',
  },
  Stable: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    short: 'Stable',
  },
  Declining: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    short: 'Declining',
  },
  Collapsing: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    dot: 'bg-red-400',
    short: 'Collapsing',
  },
}

export function TrendLabelBadge({ label, compact = false }: TrendLabelBadgeProps) {
  const cfg = TREND_CONFIG[label] ?? TREND_CONFIG['Stable']

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {compact ? cfg.short : label}
    </span>
  )
}
