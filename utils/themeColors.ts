export type ThemeMode = 'dark' | 'light'

export interface ThemeColors {
  // Panel backgrounds
  panelBg: string
  panelBgSolid: string
  cardBg: string
  cardHoverBg: string
  // Text
  textPrimary: string
  textSecondary: string
  textMuted: string
  // Borders
  border: string
  borderSubtle: string
  // Search bar / stats bar
  barBg: string
  barBorder: string
  // Modal
  modalBg: string
  modalBorder: string
  modalBackdrop: string
  // Input
  inputText: string
  inputPlaceholder: string
  // Scrollbar
  scrollThumb: string
}

const dark: ThemeColors = {
  panelBg: 'rgba(17, 24, 39, 0.95)',
  panelBgSolid: 'rgb(17, 24, 39)',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardHoverBg: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  border: 'rgba(255, 255, 255, 0.1)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  barBg: 'rgba(17, 24, 39, 0.85)',
  barBorder: 'rgba(255, 255, 255, 0.1)',
  modalBg: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
  modalBorder: 'rgba(99, 102, 241, 0.2)',
  modalBackdrop: 'rgba(0, 0, 0, 0.8)',
  inputText: '#ffffff',
  inputPlaceholder: '#6b7280',
  scrollThumb: 'rgba(255, 255, 255, 0.15)',
}

const light: ThemeColors = {
  panelBg: 'rgba(255, 255, 255, 0.92)',
  panelBgSolid: 'rgb(255, 255, 255)',
  cardBg: 'rgba(0, 0, 0, 0.04)',
  cardHoverBg: 'rgba(0, 0, 0, 0.08)',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: 'rgba(0, 0, 0, 0.12)',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  barBg: 'rgba(255, 255, 255, 0.88)',
  barBorder: 'rgba(0, 0, 0, 0.1)',
  modalBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(241, 245, 249, 0.98) 100%)',
  modalBorder: 'rgba(99, 102, 241, 0.25)',
  modalBackdrop: 'rgba(0, 0, 0, 0.4)',
  inputText: '#0f172a',
  inputPlaceholder: '#94a3b8',
  scrollThumb: 'rgba(0, 0, 0, 0.15)',
}

export function getThemeColors(theme: ThemeMode): ThemeColors {
  return theme === 'light' ? light : dark
}
