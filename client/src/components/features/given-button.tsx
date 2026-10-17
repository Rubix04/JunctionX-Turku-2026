import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, fonts, radius } from '@/theme';

type GivenButtonProps = { given: boolean; onToggle: () => void; medicineName: string };

// "Given?" / "Given ✓" toggle for a medication dose.
const GivenButton = ({ given, onToggle, medicineName }: GivenButtonProps) => {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: given }}
      accessibilityLabel={t(given ? 'reminders.givenA11y' : 'reminders.notGivenA11y', { name: medicineName })}
      onPress={onToggle}
      style={[styles.button, given ? styles.given : styles.notGiven]}
    >
      <AppText variant="bodySmall" color={given ? colors.onDark : colors.primary} style={styles.text}>
        {given ? t('reminders.given') : t('reminders.givenQuestion')}
      </AppText>
    </Pressable>
  );
};

export default GivenButton;

const styles = StyleSheet.create({
  button: { height: 40, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center' },
  given: { backgroundColor: colors.green, borderWidth: 1, borderColor: colors.green },
  notGiven: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  text: { fontFamily: fonts.bodyBold },
});
