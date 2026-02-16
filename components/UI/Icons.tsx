/**
 * Professional Icon Library
 * 
 * SVG-based iconography for intelligence-grade UI.
 * No emojis. Clean, institutional design language.
 */

import { memo } from 'react'

interface IconProps {
  size?: number
  className?: string
  color?: string
}

// Signal / Broadcast icon for Situation Room
export const SignalIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
    <path d="M7.76 16.24a6 6 0 0 1 0 -8.49" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M4.93 19.07a10 10 0 0 1 0 -14.14" />
  </svg>
))
SignalIcon.displayName = 'SignalIcon'

// Market / Chart icon
export const MarketIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 4 4 5-5" />
  </svg>
))
MarketIcon.displayName = 'MarketIcon'

// Politics / Government icon
export const PoliticsIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M3 21h18" />
    <path d="M5 21v-10" />
    <path d="M19 21v-10" />
    <path d="M9 21v-6h6v6" />
    <path d="M3 11l9-7 9 7" />
  </svg>
))
PoliticsIcon.displayName = 'PoliticsIcon'

// Technology icon
export const TechIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M7 20h10" />
    <path d="M12 16v4" />
    <path d="M7 8h.01" />
    <path d="M12 8h5" />
  </svg>
))
TechIcon.displayName = 'TechIcon'

// Security / Shield icon
export const SecurityIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z" />
  </svg>
))
SecurityIcon.displayName = 'SecurityIcon'

// Energy / Power icon
export const EnergyIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
))
EnergyIcon.displayName = 'EnergyIcon'

// Climate / Environment icon
export const ClimateIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M6.34 17.66l-1.41 1.41" />
    <path d="M19.07 4.93l-1.41 1.41" />
  </svg>
))
ClimateIcon.displayName = 'ClimateIcon'

// Diplomacy / Globe icon
export const DiplomacyIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9" />
    <path d="M12 3c-2.5 2.5-4 6-4 9s1.5 6.5 4 9" />
    <path d="M3 12h18" />
  </svg>
))
DiplomacyIcon.displayName = 'DiplomacyIcon'

// Health icon
export const HealthIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M12 8v8" />
    <path d="M8 12h8" />
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
))
HealthIcon.displayName = 'HealthIcon'

// Breaking / Alert icon
export const AlertIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
))
AlertIcon.displayName = 'AlertIcon'

// Close / X icon
export const CloseIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="2">
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
))
CloseIcon.displayName = 'CloseIcon'

// Chevron icons
export const ChevronLeft = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
))
ChevronLeft.displayName = 'ChevronLeft'

export const ChevronRight = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
))
ChevronRight.displayName = 'ChevronRight'

export const ChevronDown = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
))
ChevronDown.displayName = 'ChevronDown'

// External link icon
export const ExternalLinkIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
  </svg>
))
ExternalLinkIcon.displayName = 'ExternalLinkIcon'

// Location / Pin icon
export const LocationIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M12 21c-4-4-8-7.5-8-12a8 8 0 1116 0c0 4.5-4 8-8 12z" />
    <circle cx="12" cy="9" r="3" />
  </svg>
))
LocationIcon.displayName = 'LocationIcon'

// Filter icon
export const FilterIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M4 4h16v2.17a2 2 0 01-.59 1.42L14 13v7l-4-2v-5L4.59 7.59A2 2 0 014 6.17V4z" />
  </svg>
))
FilterIcon.displayName = 'FilterIcon'

// Equities / Stock icon
export const EquitiesIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-8 4 5 5-9" />
  </svg>
))
EquitiesIcon.displayName = 'EquitiesIcon'

// Economy icon
export const EconomyIcon = memo(({ size = 16, className = '', color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9a2.5 2.5 0 00-5 0c0 2.5 5 2.5 5 5a2.5 2.5 0 01-5 0" />
    <path d="M12 6v2" />
    <path d="M12 16v2" />
  </svg>
))
EconomyIcon.displayName = 'EconomyIcon'

// Live indicator dot
export const LiveIndicator = memo(({ className = '' }: { className?: string }) => (
  <span 
    className={`inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ${className}`}
    style={{ 
      animation: 'pulse 2s ease-in-out infinite',
      boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)'
    }}
  />
))
LiveIndicator.displayName = 'LiveIndicator'

// Get icon component by category
export function getCategoryIcon(category: string): React.ComponentType<IconProps> {
  const iconMap: Record<string, React.ComponentType<IconProps>> = {
    'all': SignalIcon,
    'breaking': AlertIcon,
    'markets': MarketIcon,
    'equities': EquitiesIcon,
    'economy': EconomyIcon,
    'politics': PoliticsIcon,
    'technology': TechIcon,
    'security': SecurityIcon,
    'energy': EnergyIcon,
    'climate': ClimateIcon,
    'diplomacy': DiplomacyIcon,
    'health': HealthIcon,
    // Map old categories
    'armed-conflict': SecurityIcon,
    'business': EconomyIcon,
    'crime': SecurityIcon,
    'science': TechIcon,
    'entertainment': SignalIcon,
    'sports': SignalIcon,
    'other': SignalIcon,
  }
  return iconMap[category] || SignalIcon
}
