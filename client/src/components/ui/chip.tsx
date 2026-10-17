import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, fonts, radius } from '@/theme';

// Small teal tag, e.g. the symptoms on a watch list. Lay chips out with a wrapping row + gap.
const Chip = ({ label }: { label: string }) => (
  <View style={styles.chip}>
    <AppText variant="caption" color={colors.primary} style={styles.label}>
      {label}
    </AppText>
  </View>
);

export default Chip;

const styles = StyleSheet.create({
  chip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.bodySemiBold },
});
