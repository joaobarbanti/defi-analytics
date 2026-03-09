import { RISK_COLOR, RISK_LABEL } from '@/types/risk'
import type { RiskLevel } from '@/types/risk'

interface RiskBadgeProps {
  risk: RiskLevel
  /** Compact variant shows a colored dot only (for table cells) */
  compact?: boolean
  className?: string
}

export function RiskBadge({ risk, compact = false, className = '' }: RiskBadgeProps) {
  const color = RISK_COLOR[risk]
  const label = RISK_LABEL[risk]

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        title={label}
      >
        <span
          className="inline-block h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium" style={{ color }}>
          {risk.charAt(0).toUpperCase() + risk.slice(1)}
        </span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
