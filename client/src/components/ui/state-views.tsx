import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import { colors, spacing } from '@/theme';

// Loading, error and empty states, shared by every screen that loads data.

export const LoadingView = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityLabel={t('common.loading')}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
};

export const ErrorView = ({ onRetry }: { onRetry?: () => void }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <AppText variant="title">{t('common.errorTitle')}</AppText>
      <AppText color={colors.muted} style={styles.text}>
        {t('common.errorBody')}
      </AppText>
      {onRetry && <Button label={t('common.retry')} onPress={onRetry} variant="outline" />}
    </View>
  );
};

export const EmptyView = ({ title, body }: { title: string; body?: string }) => (
  <View style={styles.empty}>
    <AppText variant="label">{title}</AppText>
    {body ? (
      <AppText variant="bodySmall" color={colors.muted} style={styles.text}>
        {body}
      </AppText>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  center: { paddingVertical: 64, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { textAlign: 'center' },
  empty: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
