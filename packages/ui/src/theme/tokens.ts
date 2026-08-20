export const colors = {
  background: {
    canvas: '#080c16',
    surface: '#0f172a',
    elevated: '#111827',
    muted: '#1e293b',
    overlay: 'rgba(0, 0, 0, 0.60)',
  },

  border: {
    subtle: '#1e293b',
    default: '#334155',
    strong: '#475569',
  },

  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
    inverse: '#080c16',
  },

  accent: {
    primary: '#3b82f6',
    hover: '#2563eb',
    active: '#1d4ed8',
  },

  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#38bdf8',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export const radii = {
  none: '0',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.20)',
  md: '0 4px 12px rgba(0, 0, 0, 0.30)',
  lg: '0 12px 32px rgba(0, 0, 0, 0.40)',
  xl: '0 20px 48px rgba(0, 0, 0, 0.50)',
} as const;

export const motion = {
  fast: '120ms',
  normal: '180ms',
  slow: '260ms',
} as const;

export const tokens = {
  colors,
  spacing,
  radii,
  shadows,
  motion,
} as const;

export type NevoTokens = typeof tokens;
export type NevoColors = typeof colors;