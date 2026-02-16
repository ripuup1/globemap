/**
 * Vox Terra Logo Component
 * 
 * "Voice of the Earth" - Latin branding for the global news platform
 * Features:
 * - Animated glowing orb icon
 * - Futuristic typography
 * - Subtle hover effects
 */

import { memo } from 'react'

interface VoxTerraLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  className?: string
}

function VoxTerraLogo({ size = 'md', showTagline = false, className = '' }: VoxTerraLogoProps) {
  const sizes = {
    sm: { orb: 20, text: 'text-sm', tagline: 'text-[8px]' },
    md: { orb: 28, text: 'text-lg', tagline: 'text-[10px]' },
    lg: { orb: 40, text: 'text-2xl', tagline: 'text-xs' },
  }
  
  const { orb, text, tagline } = sizes[size]
  
  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}>
      {/* Animated Glowing Orb */}
      <div 
        className="relative flex-shrink-0"
        style={{ width: orb, height: orb }}
      >
        {/* Outer glow ring */}
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)',
            filter: 'blur(4px)',
          }}
        />
        
        {/* Earth orb */}
        <div 
          className="absolute inset-1 rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0c1929 50%, #1a365d 100%)',
            boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.5), inset 2px 2px 6px rgba(99, 102, 241, 0.3), 0 0 12px rgba(99, 102, 241, 0.4)',
          }}
        >
          {/* Continent hints */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 40% 30% at 30% 40%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
                radial-gradient(ellipse 25% 40% at 70% 50%, rgba(34, 197, 94, 0.25) 0%, transparent 50%)
              `,
            }}
          />
          
          {/* Atmosphere glow */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.2) 0%, transparent 50%)',
            }}
          />
        </div>
        
        {/* Orbital ring */}
        <div 
          className="absolute inset-0"
          style={{
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '50%',
            transform: 'rotateX(70deg)',
            animation: 'orbit-spin 8s linear infinite',
          }}
        />
        
        <style>{`
          @keyframes orbit-spin {
            from { transform: rotateX(70deg) rotateZ(0deg); }
            to { transform: rotateX(70deg) rotateZ(360deg); }
          }
        `}</style>
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <span 
          className={`${text} font-bold tracking-wider text-white`}
          style={{
            textShadow: '0 0 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(99, 102, 241, 0.2)',
            letterSpacing: '0.1em',
          }}
        >
          VOX<span className="text-indigo-400">TERRA</span>
        </span>
        
        {showTagline && (
          <span className={`${tagline} text-gray-500 tracking-widest uppercase`}>
            Voice of the Earth
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(VoxTerraLogo)
