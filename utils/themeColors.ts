export interface ThemeColors {
  panelBg: string
  panelBgSolid: string
  cardBg: string
  cardHoverBg: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  border: string
  borderSubtle: string
  barBg: string
  barBorder: string
  modalBg: string
  modalBorder: string
  modalBackdrop: string
  inputText: string
  inputPlaceholder: string
  scrollThumb: string
}

export const themeColors: ThemeColors = {
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
