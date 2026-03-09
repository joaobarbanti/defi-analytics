'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useProtocols } from '@/hooks/useProtocols'
import { useYields } from '@/hooks/useYields'
import { filterTopProtocols, normalizeProtocol } from '@/lib/transforms/normalizeProtocol'
import { initializeNodePositions } from '@/lib/graph/forceSimulation'
import type { ProtocolNode } from '@/types/defillama'
import { ProtocolNodeMesh } from './ProtocolNode'
import { EdgeLines } from './EdgeLines'
import { ParticleField } from './ParticleField'
import { Legend } from './Legend'
import { Spinner } from '@/components/ui/Spinner'

function Scene({ nodes }: { nodes: ProtocolNode[] }) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[20, 20, 20]} intensity={1.5} color="#3b82f6" />
      <pointLight position={[-20, -10, -20]} intensity={1} color="#8b5cf6" />
      <pointLight position={[0, -20, 0]} intensity={0.8} color="#10b981" />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={3}
        saturation={0.5}
        fade
        speed={0.3}
      />

      <ParticleField count={1500} />
      <EdgeLines nodes={nodes} />

      {nodes.map((node) => (
        <ProtocolNodeMesh key={node.id} node={node} />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={80}
        autoRotate
        autoRotateSpeed={0.3}
        makeDefault
      />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.8}
          mipmapBlur
        />
      </EffectComposer>

      <Legend />
    </>
  )
}

export function EcosystemCloud() {
  const { protocols, isLoading } = useProtocols()
  const { pools } = useYields()

  // Build APY lookup by protocol slug
  const apyBySlug = useMemo(() => {
    const map: Record<string, number> = {}
    for (const pool of pools) {
      if (pool.project && pool.apy) {
        if (!map[pool.project] || pool.apy > map[pool.project]) {
          map[pool.project] = pool.apy
        }
      }
    }
    return map
  }, [pools])

  const nodes = useMemo(() => {
    if (!protocols.length) return []
    const top = filterTopProtocols(protocols, 250)
    const normalized = top.map((p) =>
      normalizeProtocol(p, apyBySlug[p.slug] ?? null)
    )
    return initializeNodePositions(normalized)
  }, [protocols, apyBySlug])

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={40} />
          <p className="text-sm text-white/40">Loading DeFi ecosystem…</p>
        </div>
      </div>
    )
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 40], fov: 60, near: 0.1, far: 300 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene nodes={nodes} />
    </Canvas>
  )
}
