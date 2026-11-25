import { Pressable, StyleSheet } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, fonts, radius } from '@/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 'checkbox' for filters that combine, 'radio' when only one can be on */
  role?: 'checkbox' | 'radio';
};

// Rounded filter button: blue when on, white when off.
const Chip = ({ label, selected, onPress, role = 'checkbox' }: ChipProps) => (
  <Pressable
    accessibilityRole={role}
    accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
    onPress={onPress}
    style={[styles.chip, selected ? styles.on : styles.off]}
  >
    <AppText variant="bodySmall" color={selected ? colors.onDark : colors.text} style={styles.text}>
      {label}
    </AppText>
  </Pressable>
);

export default Chip;

const styles = StyleSheet.create({
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  off: { backgroundColor: colors.surface, borderColor: colors.border },
  text: { fontFamily: fonts.bodySemiBold },
});
