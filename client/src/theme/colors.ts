// Brand colors from the design mockups (Brand & logo board).
export const colors = {
  primary: '#0E5A63', // Vahti teal: buttons, logo
  primaryDark: '#08393F',
  primaryTint: '#E6F0F0', // chips on white cards
  primarySoft: '#D6ECEC', // hero panels, light text on teal
  primaryBorder: '#B9D3D4', // watch list cards
  primaryLight: '#D6ECEC', // text on teal
  primaryLightMuted: '#B9D9DA',
  accent: '#F2A33A', // Tassu amber: paw toes, highlights
  accentDark: '#9A5A0C', // amber icons on accentTint
  accentTint: '#FDF1DE',
  accentBorder: '#F1D3A6',
  accentText: '#7A4505', // text on accentTint
  accentBody: '#4A2D05', // body text on accentTint notes

  text: '#14232B', // Ink: main text
  textSecondary: '#3C4A50', // card body text
  muted: '#56656C', // captions, labels
  noteText: '#23383F', // text on primaryTint notes
  onDark: '#FFFFFF',
  onDarkMuted: '#C3CED2',
  onDarkFaint: '#A9B6BA',

  background: '#F5F7F6', // Mist: screen background
  surface: '#FFFFFF', // cards, tab bar
  surfaceDark: '#14232B', // dark promo card
  surfaceDarkRaised: '#2B3D45',
  photoBackground: '#0B1418', // photo crop screen
  photoSurface: '#1C2A30',
  photoBorder: '#2E3F46',
  segmentBackground: '#E3E8E6',
  divider: '#EEF1EF', // between rows inside a card
  border: '#DDE3E0', // card borders
  borderStrong: '#C9D3D0', // outline buttons
  borderDashed: '#8FA0A6', // 'add' placeholders
  radioOff: '#A5B1B5',

  // Traffic light. Always pair with an icon and a word.
  green: '#1F7A4A', // as usual
  greenTint: '#DCEFE3',
  greenText: '#145A35',
  yellow: '#F4C542', // keep an eye
  yellowBorder: '#C99A12',
  yellowMuted: '#E9D58F',
  yellowText: '#8A6400',
  red: '#B3261E', // contact a vet, Emergency button
  redTint: '#FBE9E7',
  redBorder: '#F0C4BF',
  redText: '#8E1B15',
  redOnDark: '#FFDAD6',
  redOnDarkBody: '#FFEDEA',
  redOnPhoto: '#FFB4AB',

  // Header tints behind the default pet pictures
  catTint: '#F8E3C4',
  dogTint: '#D6ECEC',
  smallAnimalTint: '#E6E9F4',
} as const;

export type ColorName = keyof typeof colors;
