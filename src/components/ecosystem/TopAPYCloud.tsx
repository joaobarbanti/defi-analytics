'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useYields } from '@/hooks/useYields'
import { getTop10SafeByAPY } from '@/lib/transforms/normalizeProtocol'
import { formatTVL, formatAPY } from '@/lib/transforms/format'
import type { YieldNode } from '@/types/defillama'
import { useDefiStore } from '@/store/defi'
import { ParticleField } from './ParticleField'
import { APYLegend } from './Legend'
import { Spinner } from '@/components/ui/Spinner'

// ── Ring layout: spread 10 nodes evenly in a horizontal circle ───────────────

function computeRingPositions(count: number, radius = 12): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    // Slight vertical variation for depth
    const y = Math.sin(angle * 2) * 1.5
    return [x, y, z]
  })
}

// ── Single yield node mesh ────────────────────────────────────────────────────

interface YieldNodeMeshProps {
  node: YieldNode
  position: [number, number, number]
}

function YieldNodeMesh({ node, position }: YieldNodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { hoveredProtocol, setHoveredProtocol, setSelectedPool } = useDefiStore()
  const isHovered = hoveredProtocol === node.id

  // Pulse speed driven by APY magnitude
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const apyFactor = node.apy ? Math.min(node.apy / 100, 1) : 0.2
    const pulse = 1 + Math.sin(t * (1.5 + apyFactor * 4)) * 0.06 * (1 + apyFactor)
    const hoverScale = isHovered ? 1.5 : 1
    meshRef.current.scale.setScalar(pulse * hoverScale)
  })

  const color = isHovered ? '#ffffff' : node.color

  return (
    <group position={position}>
      {/* Core sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedPool(node)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHoveredProtocol(node.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHoveredProtocol(null)
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[node.radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 1.1 : 0.55}
          roughness={0.2}
          metalness={0.7}
          transparent
          opacity={0.93}
        />
      </mesh>

      {/* Outer glow shell */}
      <mesh>
        <sphereGeometry args={[node.radius * 1.4, 24, 24]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>

      {/* APY ring halo */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[node.radius * 1.6, 0.05, 8, 48]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.8}
          transparent
          opacity={isHovered ? 0.9 : 0.35}
        />
      </mesh>

      {/* Hover tooltip */}
      {isHovered && (
        <Html center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="rounded-xl border border-white/20 bg-slate-900/90 px-4 py-3 text-center shadow-2xl backdrop-blur-sm min-w-[140px]">
            <p className="text-sm font-bold text-white">{node.poolSymbol}</p>
            <p className="text-xs text-white/50 mb-1">{node.primaryChain}</p>
            <p className="text-lg font-black text-emerald-400">
              {formatAPY(node.apy!)}
            </p>
            <p className="text-xs text-white/40">{formatTVL(node.tvlUsd)} TVL</p>
            {/* Safe badge */}
            <p className="mt-1 text-xs font-medium text-emerald-400/80">
              ✓ Low Risk
            </p>
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Thin connecting lines between adjacent ring nodes ────────────────────────

function RingEdges({
  positions,
  color,
}: {
  positions: [number, number, number][]
  color: string
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < positions.length; i++) {
      const next = (i + 1) % positions.length
      pts.push(new THREE.Vector3(...positions[i]))
      pts.push(new THREE.Vector3(...positions[next]))
    }
    return pts
  }, [positions])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.12} />
    </lineSegments>
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function Scene({ nodes }: { nodes: YieldNode[] }) {
  const positions = useMemo(
    () => computeRingPositions(nodes.length, 12),
    [nodes.length]
  )

  // Dominant color for edge lines — pick midpoint node's color
  const edgeColor = nodes[Math.floor(nodes.length / 2)]?.color ?? '#10b981'

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[20, 20, 20]} intensity={1.8} color="#10b981" />
      <pointLight position={[-20, -10, -20]} intensity={1.2} color="#f43f5e" />
      <pointLight position={[0, -20, 0]} intensity={0.7} color="#f97316" />

      <Stars
        radius={100}
        depth={50}
        count={2500}
        factor={3}
        saturation={0.5}
        fade
        speed={0.2}
      />

      <ParticleField count={1000} />
      <RingEdges positions={positions} color={edgeColor} />

      {nodes.map((node, i) => (
        <YieldNodeMesh key={node.id} node={node} position={positions[i]} />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={60}
        autoRotate
        autoRotateSpeed={0.5}
        makeDefault
      />

      <EffectComposer>
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
      </EffectComposer>

      <APYLegend />
    </>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function TopAPYCloud() {
  const { pools, isLoading } = useYields()

  const nodes = useMemo(() => {
    if (!pools.length) return []
    return getTop10SafeByAPY(pools)
  }, [pools])

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={40} />
          <p className="text-sm text-white/40">Loading safe yield pools…</p>
        </div>
      </div>
    )
  }

  if (!nodes.length) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-white/30">No yield data available</p>
      </div>
    )
  }

  return (
    <Canvas
      camera={{ position: [0, 8, 30], fov: 55, near: 0.1, far: 300 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene nodes={nodes} />
    </Canvas>
  )
}
