import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, radius, spacing } from '@/theme';

type CheckboxRowProps = { label: string; checked: boolean; onChange: (checked: boolean) => void };

const CheckboxRow = ({ label, checked, onChange }: CheckboxRowProps) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    onPress={() => onChange(!checked)}
    style={styles.row}
  >
    <View style={[styles.box, checked && styles.checked]}>
      {checked && <Icon name="check" size={14} color={colors.onDark} strokeWidth={3} />}
    </View>
    <AppText style={styles.label}>{label}</AppText>
  </Pressable>
);

export default CheckboxRow;

const styles = StyleSheet.create({
  row: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.radioOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: radius.sm / 2 },
  label: { flex: 1 },
});
