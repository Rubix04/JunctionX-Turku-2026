import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

// Temporary start screen to check fonts and translations. Replaced by the route skeleton.
const Index = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.tagline}>{t('common.tagline')}</Text>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: { ...typography.h1, color: colors.primary },
  tagline: { ...typography.body, color: colors.muted, textAlign: 'center' },
});
