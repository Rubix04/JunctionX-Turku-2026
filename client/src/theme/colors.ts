// Brand colors from the design mockups (Brand & logo board).
export const colors = {
  primary: '#0E5A63', // Vahti teal: buttons, logo
  primaryDark: '#08393F',
  primaryTint: '#E6F0F0', // chips on white cards
  accent: '#F2A33A', // Tassu amber: paw toes, highlights
  accentDark: '#9A5A0C', // amber icons on accentTint
  accentTint: '#FDF1DE',

  text: '#14232B', // Ink: main text
  textSecondary: '#3C4A50', // card body text
  muted: '#56656C', // captions, labels
  onDark: '#FFFFFF',
  onDarkMuted: '#C3CED2',

  background: '#F5F7F6', // Mist: screen background
  surface: '#FFFFFF', // cards, tab bar
  surfaceDark: '#14232B', // dark promo card
  surfaceDarkRaised: '#2B3D45',
  border: '#DDE3E0', // card borders
  borderStrong: '#C9D3D0', // outline buttons
  borderDashed: '#8FA0A6', // 'add' placeholders

  // Traffic light. Always pair with an icon and a word.
  green: '#1F7A4A', // as usual
  yellow: '#F4C542', // keep an eye
  red: '#B3261E', // contact a vet, Emergency button
} as const;

export type ColorName = keyof typeof colors;
