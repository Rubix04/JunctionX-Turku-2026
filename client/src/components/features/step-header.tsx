import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, fonts, spacing, touchTarget } from '@/theme';

// Back button and "Step 1 of 2" for multi-step flows such as sign-in.
const StepHeader = ({ step, total }: { step: number; total: number }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      {router.canGoBack() && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Icon name="back" size={22} />
        </Pressable>
      )}
      <AppText variant="body" color={colors.muted} style={styles.step}>
        {t('common.step', { step, total })}
      </AppText>
    </View>
  );
};

export default StepHeader;

const styles = StyleSheet.create({
  header: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  step: { fontFamily: fonts.bodySemiBold },
});
