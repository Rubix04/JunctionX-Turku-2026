import type { TextStyle } from 'react-native';

// Each weight is its own font family in React Native.
// Names must match the keys loaded with useFonts in app/_layout.tsx.
export const fonts = {
  headingSemiBold: 'Sora_600SemiBold',
  headingBold: 'Sora_700Bold',
  headingExtraBold: 'Sora_800ExtraBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

// Text styles used across the mockups.
export const typography = {
  h1: { fontFamily: fonts.headingExtraBold, fontSize: 26, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.headingBold, fontSize: 22, letterSpacing: -0.4 },
  title: { fontFamily: fonts.headingBold, fontSize: 18 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15 },
  caption: { fontFamily: fonts.body, fontSize: 13 },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tabLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
