import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import EmergencyButton from '@/components/features/emergency-button';
import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, spacing, touchTarget } from '@/theme';

type ScreenHeaderProps = {
  title: string;
  // Hide on emergency screens, where the button would point to itself.
  showEmergency?: boolean;
};

// Back button, title and the Emergency button, as at the top of most mockup screens.
const ScreenHeader = ({ title, showEmergency = true }: ScreenHeaderProps) => {
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
      <AppText variant="h2" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {showEmergency && <EmergencyButton />}
    </View>
  );
};

export default ScreenHeader;

const styles = StyleSheet.create({
  header: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  title: { flex: 1, fontSize: 20, color: colors.text },
});
