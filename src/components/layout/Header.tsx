'use client'

export function Header() {
  return (
    <header className="border-b border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Animated orb logo */}
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 opacity-90 blur-sm" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
              <span className="text-xs font-bold text-white">D</span>
            </div>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              DeFi<span className="text-blue-400">Scope</span>
            </span>
            <p className="text-xs text-white/30">Powered by DeFiLlama</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://defillama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 transition hover:text-white/60"
          >
            Data: DeFiLlama
          </a>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/40">Live</span>
          </div>
        </div>
      </div>
    </header>
  )
}
