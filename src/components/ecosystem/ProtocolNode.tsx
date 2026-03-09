'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { ProtocolNode } from '@/types/defillama'
import { useDefiStore } from '@/store/defi'
import { formatTVL } from '@/lib/transforms/format'

interface ProtocolNodeProps {
  node: ProtocolNode
}

export function ProtocolNodeMesh({ node }: ProtocolNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { hoveredProtocol, setHoveredProtocol, setSelectedProtocol } = useDefiStore()
  const isHovered = hoveredProtocol === node.id

  // APY-driven pulse animation
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const apyFactor = node.apy ? Math.min(node.apy / 100, 1) : 0.1
    const pulse = 1 + Math.sin(t * (1 + apyFactor * 3)) * 0.04 * (1 + apyFactor)
    const hoverScale = isHovered ? 1.4 : 1
    meshRef.current.scale.setScalar(pulse * hoverScale)
  })

  const color = isHovered ? '#ffffff' : node.color

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedProtocol(node)
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
        <sphereGeometry args={[node.radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.9 : 0.4}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Glow ring for large nodes */}
      {node.radius > 1.2 && (
        <mesh>
          <sphereGeometry args={[node.radius * 1.3, 16, 16]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.15}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Hover label */}
      {isHovered && (
        <Html
          center
          distanceFactor={20}
          style={{ pointerEvents: 'none' }}
        >
          <div className="rounded-lg border border-white/20 bg-slate-900/90 px-3 py-2 text-center shadow-2xl backdrop-blur-sm">
            <p className="text-sm font-semibold text-white">{node.name}</p>
            <p className="text-xs text-white/60">{formatTVL(node.tvl)}</p>
            <p className="text-xs text-white/40">{node.category}</p>
          </div>
        </Html>
      )}
    </group>
  )
}
