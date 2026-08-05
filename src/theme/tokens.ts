/** Typography, spacing, radii — shared across themes. From the v2 prototype. */

export const fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  mono: 'Menlo',
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 31 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  balance: { fontSize: 40, fontWeight: '700', lineHeight: 48 },
  amountInput: { fontSize: 40, fontWeight: '700', lineHeight: 48 },
  headTitle: { fontSize: 18, fontWeight: '500', lineHeight: 24 },
  headStep: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  bodyLg: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  tokenName: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  button: { fontSize: 14, fontWeight: '500', lineHeight: 17 },
  mono: { fontSize: 13, fontWeight: '400', letterSpacing: -0.26 },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32,
} as const;

export const radii = {
  sm: 8, md: 12, lg: 14, pill: 999, full: 9999,
} as const;

export const layout = {
  screenPaddingH: 20,
  screenPaddingTop: 18,
  screenPaddingBottom: 24,
} as const;

export type TypographyVariant = keyof typeof typography;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
