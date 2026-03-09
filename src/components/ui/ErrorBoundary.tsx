'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex h-full w-full items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <div>
            <p className="text-sm font-semibold text-red-400">Something went wrong</p>
            <p className="mt-1 text-xs text-white/30">{this.state.error.message}</p>
            <button
              className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/50 hover:bg-white/10"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
