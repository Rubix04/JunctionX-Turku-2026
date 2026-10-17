// Brand colors: deep blue on warm off-white, with warm sand and orange accents.
export const colors = {
  primary: '#0B5AA0', // Deep blue: buttons, logo, headings
  primaryDark: '#083F70',
  primaryTint: '#E8EEF7', // chips on white cards
  primarySoft: '#DCE6F3', // hero panels, light text on teal
  primaryBorder: '#BFD0E6', // watch list cards
  primaryLight: '#DCE6F3', // text on blue
  primaryLightMuted: '#B8CBE4',
  accent: '#EE9B5A', // Warm orange: paw toes, highlights
  accentDark: '#9A5418', // amber icons on accentTint
  accentTint: '#F5EDE1', // warm sand: active tab, soft panels,
  accentBorder: '#E6D3B5',
  accentText: '#7A4210', // text on accentTint
  accentBody: '#4A2A0C', // body text on accentTint notes

  text: '#1B2733', // Ink: main text
  textSecondary: '#3A4652', // card body text
  muted: '#5E6670', // captions, labels
  noteText: '#22364F', // text on primaryTint notes
  onDark: '#FFFFFF',
  onDarkMuted: '#C5CFDB',
  onDarkFaint: '#A8B5C4',

  background: '#FAF8F5', // Warm off-white: screen background
  surface: '#FFFFFF', // cards, tab bar
  surfaceDark: '#13263A', // dark promo card
  surfaceDarkRaised: '#2A3D52',
  photoBackground: '#0B1418', // photo crop screen
  photoSurface: '#1C2A30',
  photoBorder: '#2E3F46',
  segmentBackground: '#EEE9E1',
  divider: '#F1EEE9', // between rows inside a card
  border: '#E6E1D9', // card borders
  borderStrong: '#D2CBC0', // outline buttons
  borderDashed: '#A39A8E', // 'add' placeholders
  radioOff: '#ADA79F',

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
  catTint: '#F6E1CF',
  dogTint: '#DCE6F3',
  smallAnimalTint: '#E3EBE1',
} as const;

export type ColorName = keyof typeof colors;
