import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { colors, fonts, radius, spacing } from '@/theme';

export type PillTone = 'green' | 'amber' | 'red' | 'teal' | 'white' | 'neutral';

const tones: Record<PillTone, { background: string; text: string }> = {
  green: { background: colors.greenTint, text: colors.greenText },
  amber: { background: colors.accentTint, text: colors.accentText },
  red: { background: colors.redTint, text: colors.redText },
  teal: { background: colors.primaryTint, text: colors.primary },
  white: { background: colors.surface, text: colors.primary },
  neutral: { background: colors.segmentBackground, text: colors.textSecondary },
};

// Small status tag, e.g. "Open now", "Valid", "Paid".
const Pill = ({ label, tone = 'teal', icon }: { label: string; tone?: PillTone; icon?: IconName }) => (
  <View style={[styles.pill, { backgroundColor: tones[tone].background }]}>
    {icon && <Icon name={icon} size={13} color={tones[tone].text} strokeWidth={2.5} />}
    <AppText variant="caption" color={tones[tone].text} style={styles.label}>
      {label}
    </AppText>
  </View>
);

export default Pill;

const styles = StyleSheet.create({
  pill: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  label: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
});
