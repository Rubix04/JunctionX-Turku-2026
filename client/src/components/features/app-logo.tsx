import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

type AppLogoProps = {
  size?: number;
  variant?: 'primary' | 'light' | 'dark';
};

// Shield ("Vahti") with a paw ("Tassu") inside. Variants from the Brand board.
const palettes = {
  primary: { tile: colors.primary, shield: colors.background },
  light: { tile: colors.background, shield: colors.primary },
  dark: { tile: colors.text, shield: colors.background },
};

const AppLogo = ({ size = 72, variant = 'primary' }: AppLogoProps) => {
  const { tile, shield } = palettes[variant];

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="TassuVahti">
      <Rect width="120" height="120" rx="30" fill={tile} />
      <Path d="M60 16 L93 29 V55 C93 78 79 95 60 104 C41 95 27 78 27 55 V29 Z" fill={shield} />
      <Path
        d="M60 62c-9.5 0-17 7.5-17 14 0 5 4 7.5 8.5 7.5 3.5 0 5.5-2 8.5-2s5 2 8.5 2c4.5 0 8.5-2.5 8.5-7.5 0-6.5-7.5-14-17-14z"
        fill={tile}
      />
      <Circle cx="43" cy="55" r="6" fill={colors.accent} />
      <Circle cx="52.5" cy="44" r="6" fill={colors.accent} />
      <Circle cx="67.5" cy="44" r="6" fill={colors.accent} />
      <Circle cx="77" cy="55" r="6" fill={colors.accent} />
    </Svg>
  );
};

export default AppLogo;
