import { StyleSheet, View } from 'react-native';

import Icon, { type IconName } from '@/components/ui/icon';
import { colors, radius } from '@/theme';

type IconTileProps = {
  name: IconName;
  tone?: 'teal' | 'amber' | 'red' | 'dark' | 'white';
  size?: number;
};

const tones = {
  teal: { background: colors.primaryTint, icon: colors.primary },
  amber: { background: colors.accentTint, icon: colors.accentDark },
  red: { background: colors.redTint, icon: colors.redText },
  dark: { background: colors.surfaceDarkRaised, icon: colors.accent },
  white: { background: colors.surface, icon: colors.primary },
};

// Rounded square with an icon, at the start of list rows and cards.
const IconTile = ({ name, tone = 'teal', size = 40 }: IconTileProps) => (
  <View
    style={[
      styles.tile,
      { width: size, height: size, backgroundColor: tones[tone].background },
      tone === 'white' && styles.bordered,
    ]}
  >
    <Icon name={name} size={size * 0.5} color={tones[tone].icon} />
  </View>
);

export default IconTile;

const styles = StyleSheet.create({
  tile: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  bordered: { borderWidth: 1, borderColor: colors.border },
});
