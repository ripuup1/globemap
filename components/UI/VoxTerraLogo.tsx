/**
 * Vox Terra Logo Component - Radar Globe Design
 *
 * Radar-style wireframe globe with data points and connections.
 * Supports size variants ('sm' | 'md' | 'lg') and optional wordmark/tagline.
 */

import { memo } from 'react'

interface VoxTerraLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  showWordmark?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: 28,
  md: 40,
  lg: 64,
}

function VoxTerraLogo({ size = 'md', showWordmark = true, showTagline = false, className = '' }: VoxTerraLogoProps) {
  const px = SIZE_MAP[size]
  const wordmarkHeight = showWordmark ? (showTagline ? 56 : 32) : 0
  const gap = showWordmark ? 8 : 0
  const totalHeight = px + gap + wordmarkHeight
  const totalWidth = showWordmark ? Math.max(px, 180) : px
  const cx = totalWidth / 2
  const cy = px / 2
  const r = px * 0.367

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="vt-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#00D4AA" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Globe Mark */}
      <g transform={`translate(${cx - px / 2}, 0)`}>
        {/* Glow */}
        <circle cx={px / 2} cy={px / 2} r={r * 1.03} fill="url(#vt-glow)" />

        {/* Radar rings */}
        <circle cx={px / 2} cy={px / 2} r={r} stroke="#00D4AA" strokeWidth={px * 0.007} fill="none" opacity="0.5" />
        <circle cx={px / 2} cy={px / 2} r={r * 0.727} stroke="#00D4AA" strokeWidth={px * 0.003} fill="none" opacity="0.18" />
        <circle cx={px / 2} cy={px / 2} r={r * 0.485} stroke="#00D4AA" strokeWidth={px * 0.003} fill="none" opacity="0.14" />

        {/* Crosshairs */}
        <line x1={px / 2} y1={cy - r - 2} x2={px / 2} y2={cy + r + 2} stroke="#00D4AA" strokeWidth={px * 0.002} opacity="0.12" />
        <line x1={cx - r - 2 - (cx - px / 2)} y1={px / 2} x2={cx + r + 2 - (cx - px / 2)} y2={px / 2} stroke="#00D4AA" strokeWidth={px * 0.002} opacity="0.12" />

        {/* Wireframe globe */}
        <ellipse cx={px / 2} cy={px / 2} rx={r * 0.5} ry={r} stroke="#d0d0d8" strokeWidth={px * 0.005} fill="none" opacity="0.35" />
        <ellipse cx={px / 2} cy={px / 2} rx={r * 0.788} ry={r} stroke="#d0d0d8" strokeWidth={px * 0.003} fill="none" opacity="0.2" />
        <ellipse cx={px / 2} cy={px / 2} rx={r} ry={r * 0.333} stroke="#d0d0d8" strokeWidth={px * 0.003} fill="none" opacity="0.2" />

        {/* Sweep line */}
        <line
          x1={px / 2} y1={px / 2}
          x2={px / 2} y2={cy - r + 2}
          stroke="#00D4AA" strokeWidth={px * 0.008} opacity="0.7" strokeLinecap="round"
        />

        {/* Primary data point */}
        <circle cx={px * 0.6} cy={px * 0.356} r={px * 0.019} fill="#00D4AA" opacity="0.9" />
        <circle cx={px * 0.6} cy={px * 0.356} r={px * 0.044} stroke="#00D4AA" strokeWidth={px * 0.003} fill="none" opacity="0.25" />

        {/* Secondary data points */}
        <circle cx={px * 0.4} cy={px * 0.444} r={px * 0.014} fill="#00D4AA" opacity="0.6" />
        <circle cx={px * 0.639} cy={px * 0.583} r={px * 0.011} fill="#00D4AA" opacity="0.5" />
        <circle cx={px * 0.433} cy={px * 0.639} r={px * 0.011} fill="#00D4AA" opacity="0.4" />

        {/* Connections */}
        <line x1={px * 0.6} y1={px * 0.356} x2={px * 0.4} y2={px * 0.444} stroke="#00D4AA" strokeWidth={px * 0.002} opacity="0.15" />
        <line x1={px * 0.6} y1={px * 0.356} x2={px * 0.639} y2={px * 0.583} stroke="#00D4AA" strokeWidth={px * 0.002} opacity="0.12" />
      </g>

      {/* Wordmark */}
      {showWordmark && (
        <g>
          <text
            x={totalWidth / 2}
            y={px + gap + 18}
            textAnchor="middle"
            fontFamily="'Space Mono', monospace"
            fontWeight="700"
            fontSize="18"
            fill="#00D4AA"
            letterSpacing="8"
          >
            VOX TERRA
          </text>
          {showTagline && (
            <text
              x={totalWidth / 2}
              y={px + gap + 38}
              textAnchor="middle"
              fontFamily="'Space Mono', monospace"
              fontWeight="400"
              fontSize="7"
              fill="#00D4AA"
              letterSpacing="4"
              opacity="0.4"
            >
              GLOBAL NEWS VISUALIZATION
            </text>
          )}
        </g>
      )}
    </svg>
  )
}

export default memo(VoxTerraLogo)
