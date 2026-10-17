export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20, // screen side padding
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 12, // icon tiles
  md: 14, // buttons
  lg: 16, // list rows
  xl: 22, // main cards
  pill: 999,
} as const;

// Minimum touch target size (README: at least 44 x 44).
export const touchTarget = 44;
