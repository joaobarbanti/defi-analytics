import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/types/risk'
import type { PoolCategory } from '@/types/risk'

interface PoolCategoryBadgeProps {
  category: PoolCategory
  className?: string
}

export function PoolCategoryBadge({ category, className = '' }: PoolCategoryBadgeProps) {
  const color = CATEGORY_COLOR[category]
  const label = CATEGORY_LABEL[category]

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
  )
}
