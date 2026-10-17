import { type Href, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import { colors, radius, spacing, touchTarget } from '@/theme';

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
  showEmergency?: boolean;
};

// Temporary screen used while the real screens are built.
// Links let you walk through the navigation before the UI exists.
const PlaceholderScreen = ({
  title,
  links = [],
  action,
  showEmergency = true,
}: PlaceholderScreenProps) => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={title} showEmergency={showEmergency} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="bodySmall" color={colors.muted}>
          {t('placeholder.notBuilt')}
        </AppText>

        {links.map((link) => (
          <Link key={link.label} href={link.href} style={styles.link}>
            <AppText variant="label" color={colors.primary}>
              {link.label}
            </AppText>
          </Link>
        ))}

        {action && <Button label={action.label} onPress={action.onPress} />}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlaceholderScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md },
  link: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
