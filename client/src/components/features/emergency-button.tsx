import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';

// The red Emergency button shown on every screen. Opens emergency mode,
// which works without signing in.
const EmergencyButton = () => {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/emergency')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name="emergency" size={18} color={colors.onDark} strokeWidth={2.2} />
      <AppText variant="bodySmall" color={colors.onDark} style={styles.label}>
        {t('common.emergency')}
      </AppText>
    </Pressable>
  );
};

export default EmergencyButton;

const styles = StyleSheet.create({
  button: {
    height: touchTarget,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.bodyBold },
});
