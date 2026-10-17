import { type Href, Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, touchTarget, typography } from '@/theme';

type PlaceholderLink = {
  label: string;
  href: Href;
};

type PlaceholderAction = {
  label: string;
  onPress: () => void;
};

type PlaceholderScreenProps = {
  title: string;
  links?: PlaceholderLink[];
  action?: PlaceholderAction;
};

// Temporary screen used while the real screens are built.
// Links let you walk through the navigation before the UI exists.
const PlaceholderScreen = ({ title, links = [], action }: PlaceholderScreenProps) => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {router.canGoBack() && (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
            <Text style={styles.linkText}>{t('common.back')}</Text>
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>{t('placeholder.notBuilt')}</Text>

        {links.map((link) => (
          <Link key={link.label} href={link.href} style={styles.link}>
            <Text style={styles.linkText}>{link.label}</Text>
          </Link>
        ))}

        {action && (
          <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.action}>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlaceholderScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md },
  back: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  title: { ...typography.h1, color: colors.text },
  note: { ...typography.bodySmall, color: colors.muted, marginBottom: spacing.sm },
  link: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  linkText: { ...typography.label, color: colors.primary },
  action: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { ...typography.label, color: colors.onDark },
});
