import { Image } from 'expo-image';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { colors } from '@/theme';

export type PetSpecies = 'cat' | 'dog' | 'small';

type PetAvatarProps = {
  species: PetSpecies;
  photoUrl?: string | null;
  size?: number;
};

// Default pictures from the Brand board, shown until the owner adds a photo.
const DefaultPicture = ({ species, size }: { species: PetSpecies; size: number }) => {
  const ink = colors.text;

  if (species === 'cat') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
        <Circle cx="32" cy="32" r="32" fill="#F8E3C4" />
        <Path d="M15 28 17 11 29 21z" fill="#C9772B" />
        <Path d="M49 28 47 11 35 21z" fill="#C9772B" />
        <Ellipse cx="32" cy="37" rx="18" ry="15" fill="#C9772B" />
        <Circle cx="25" cy="35" r="2.2" fill={ink} />
        <Circle cx="39" cy="35" r="2.2" fill={ink} />
        <Path d="M30 41h4l-2 2.5z" fill={ink} />
      </Svg>
    );
  }

  if (species === 'dog') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
        <Circle cx="32" cy="32" r="32" fill="#D6ECEC" />
        <Ellipse cx="17" cy="31" rx="6" ry="12" fill="#5C3B24" transform="rotate(15 17 31)" />
        <Ellipse cx="47" cy="31" rx="6" ry="12" fill="#5C3B24" transform="rotate(-15 47 31)" />
        <Ellipse cx="32" cy="35" rx="14" ry="16" fill="#8B5E3C" />
        <Ellipse cx="32" cy="43" rx="8" ry="6" fill="#E9D3B8" />
        <Ellipse cx="32" cy="40" rx="3" ry="2.2" fill={ink} />
        <Circle cx="26" cy="32" r="2.2" fill={ink} />
        <Circle cx="38" cy="32" r="2.2" fill={ink} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <Circle cx="32" cy="32" r="32" fill="#E6E9F4" />
      <Ellipse cx="24" cy="18" rx="5" ry="12" fill="#9A8C80" />
      <Ellipse cx="40" cy="18" rx="5" ry="12" fill="#9A8C80" />
      <Ellipse cx="32" cy="38" rx="15" ry="14" fill="#9A8C80" />
      <Circle cx="26" cy="36" r="2" fill={ink} />
      <Circle cx="38" cy="36" r="2" fill={ink} />
      <Path d="M30 42h4l-2 2z" fill={ink} />
    </Svg>
  );
};

// Decorative: show the pet's name next to it.
const PetAvatar = ({ species, photoUrl, size = 36 }: PetAvatarProps) =>
  photoUrl ? (
    <Image
      source={{ uri: photoUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessible={false}
    />
  ) : (
    <DefaultPicture species={species} size={size} />
  );

export default PetAvatar;
