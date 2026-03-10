interface SectionHeaderProps {
  title: string
  subtitle?: string
  /** Optional right-side content (e.g. a badge or timestamp) */
  trailing?: React.ReactNode
}

/**
 * Consistent Bloomberg-style section header with optional subtitle and trailing slot.
 */
export function SectionHeader({ title, subtitle, trailing }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-bold tracking-wide text-white/90 uppercase">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  )
}
