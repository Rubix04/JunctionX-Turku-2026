import { type Href, Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, fonts, touchTarget } from '@/theme';

type SectionLabelProps = {
  label: string;
  /** Optional link on the right, e.g. "All reminders" */
  action?: { label: string; href: Href } | { label: string; onPress: () => void };
  color?: string;
};

// Small uppercase heading above a group of cards.
const SectionLabel = ({ label, action, color = colors.muted }: SectionLabelProps) => (
  <View style={styles.row}>
    <AppText variant="overline" color={color} accessibilityRole="header" style={styles.label}>
      {label}
    </AppText>
    {action &&
      ('href' in action ? (
        <Link href={action.href} style={styles.action}>
          <AppText variant="bodySmall" color={colors.primary} style={styles.actionText}>
            {action.label}
          </AppText>
        </Link>
      ) : (
        <AppText
          variant="bodySmall"
          color={colors.primary}
          style={[styles.action, styles.actionText]}
          accessibilityRole="button"
          onPress={action.onPress}
        >
          {action.label}
        </AppText>
      ))}
  </View>
);

export default SectionLabel;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  label: { flexShrink: 1 },
  action: { minHeight: touchTarget, textAlignVertical: 'center', paddingVertical: 12, marginVertical: -12 },
  actionText: { fontFamily: fonts.bodySemiBold },
});
