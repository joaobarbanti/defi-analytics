'use client'

import { useDefiStore } from '@/store/defi'
import type { AlertSeverity } from '@/types/analytics'

// ── Config ────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { border: string; bg: string; dot: string; label: string; labelColor: string }
> = {
  critical: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/8',
    dot: 'bg-red-500',
    label: 'CRITICAL',
    labelColor: 'text-red-400',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/6',
    dot: 'bg-amber-400',
    label: 'WARNING',
    labelColor: 'text-amber-400',
  },
  info: {
    border: 'border-blue-500/25',
    bg: 'bg-blue-500/5',
    dot: 'bg-blue-400',
    label: 'INFO',
    labelColor: 'text-blue-400',
  },
}

// ── Alert Badge (re-exported for use in Header) ───────────────────────────────

export function AlertBellButton() {
  const analytics = useDefiStore((s) => s.analytics)
  const dismissedAlertIds = useDefiStore((s) => s.dismissedAlertIds)
  const activeAlerts = analytics ? analytics.alerts.filter((a) => !dismissedAlertIds.has(a.id)) : []
  const setAlertPanelOpen = useDefiStore((s) => s.setAlertPanelOpen)
  const isAlertPanelOpen = useDefiStore((s) => s.isAlertPanelOpen)

  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length
  const unread = activeAlerts.length

  return (
    <button
      onClick={() => setAlertPanelOpen(!isAlertPanelOpen)}
      title={
        criticalCount > 0
          ? `${criticalCount} critical alert${criticalCount !== 1 ? 's' : ''}`
          : unread > 0
          ? `${unread} alert${unread !== 1 ? 's' : ''}`
          : 'No active alerts'
      }
      className={`relative flex items-center gap-1.5 rounded-lg border bg-white/5 px-3 py-1.5 text-sm text-white/60 transition hover:text-white ${
        criticalCount > 0
          ? 'border-red-500/40 ring-2 ring-red-500/40 hover:border-red-500/60'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Pulsing ring — only visible when there are critical alerts */}
      {criticalCount > 0 && (
        <span className="absolute inset-0 rounded-lg animate-ping bg-red-500/20 pointer-events-none" />
      )}

      {/* Bell icon */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      <span>Alerts</span>

      {/* Unread badge */}
      {unread > 0 && (
        <span
          className={`absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
            criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'
          }`}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}

// ── Alert Panel Section ───────────────────────────────────────────────────────

export function AlertPanel() {
  const analytics = useDefiStore((s) => s.analytics)
  const dismissedAlertIds = useDefiStore((s) => s.dismissedAlertIds)
  const activeAlerts = analytics ? analytics.alerts.filter((a) => !dismissedAlertIds.has(a.id)) : []
  const dismissAlert = useDefiStore((s) => s.dismissAlert)
  const isOpen = useDefiStore((s) => s.isAlertPanelOpen)

  // Always render the section if there are alerts, regardless of isOpen toggle
  // (isOpen controls the header button's active state; section is always visible)
  void isOpen

  if (!activeAlerts.length) return null

  // Sort: critical first, then warning, then info; newest within each tier
  const sorted = [...activeAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    const sevDiff = order[a.severity] - order[b.severity]
    if (sevDiff !== 0) return sevDiff
    return b.timestamp - a.timestamp
  })

  const criticalCount = sorted.filter((a) => a.severity === 'critical').length

  return (
    <section className="px-4 sm:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Market Alerts</h2>
          <p className="text-sm text-white/40">
            {sorted.length} active alert{sorted.length !== 1 ? 's' : ''}
            {criticalCount > 0 && (
              <span className="ml-2 text-red-400 font-medium">
                · {criticalCount} critical
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => sorted.forEach((a) => dismissAlert(a.id))}
          className="text-xs text-white/30 transition hover:text-white/60"
        >
          Dismiss all
        </button>
      </div>

      <div className="space-y-2.5 stagger-children">
        {sorted.map((alert) => {
          const cfg = SEVERITY_CONFIG[alert.severity]
          return (
            <div
              key={alert.id}
              className={`animate-fade-up flex items-start gap-4 rounded-xl border px-5 py-4 transition-all ${cfg.border} ${cfg.bg}`}
            >
              {/* Severity dot */}
              <div className="mt-0.5 flex-shrink-0">
                <span
                  className={`block h-2.5 w-2.5 rounded-full ${cfg.dot} ${
                    alert.severity === 'critical' ? 'animate-pulse' : ''
                  }`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold ${cfg.labelColor}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-white/25">
                    {new Date(alert.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white leading-snug">
                  {alert.title}
                </p>
                <p className="mt-0.5 text-xs text-white/50 leading-relaxed">
                  {alert.body}
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => dismissAlert(alert.id)}
                className="flex-shrink-0 text-white/20 transition hover:text-white/60 text-lg leading-none mt-0.5"
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
