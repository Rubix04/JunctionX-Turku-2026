import { Image } from 'expo-image';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { petPhotoSource } from '@/services/pet-photos';
import { colors } from '@/theme';
import type { Species } from '@/types/pet';

type PetAvatarProps = {
  species: Species;
  photoUrl?: string | null;
  size?: number;
};

// Default pictures from the Brand board, shown until the owner adds a photo.
const DefaultPicture = ({ species, size }: { species: Species; size: number }) => {
  const ink = colors.text;

  if (species === 'cat') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
        <Circle cx="32" cy="32" r="32" fill={colors.catTint} />
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
        <Circle cx="32" cy="32" r="32" fill={colors.dogTint} />
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
      <Circle cx="32" cy="32" r="32" fill={colors.smallAnimalTint} />
      <Ellipse cx="24" cy="18" rx="5" ry="12" fill="#9A8C80" />
      <Ellipse cx="40" cy="18" rx="5" ry="12" fill="#9A8C80" />
      <Ellipse cx="32" cy="38" rx="15" ry="14" fill="#9A8C80" />
      <Circle cx="26" cy="36" r="2" fill={ink} />
      <Circle cx="38" cy="36" r="2" fill={ink} />
      <Path d="M30 42h4l-2 2z" fill={ink} />
    </Svg>
  );
};

/** Background behind the default picture, e.g. the pet page header */
export const speciesTint: Record<Species, string> = {
  cat: colors.catTint,
  dog: colors.dogTint,
  smallAnimal: colors.smallAnimalTint,
};

// Decorative: show the pet's name next to it.
const PetAvatar = ({ species, photoUrl, size = 36 }: PetAvatarProps) => {
  // The backend's photoUrl is a private path; this adds the server address and access token.
  const source = petPhotoSource(photoUrl);
  return source ? (
    <Image source={source} style={{ width: size, height: size, borderRadius: size / 2 }} accessible={false} />
  ) : (
    <DefaultPicture species={species} size={size} />
  );
};

export default PetAvatar;
