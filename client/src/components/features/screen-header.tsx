import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import EmergencyButton from '@/components/features/emergency-button';
import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, spacing, touchTarget } from '@/theme';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  // Hide on emergency screens, where the button would point to itself.
  showEmergency?: boolean;
  /** 'close' for modals */
  backIcon?: 'back' | 'close';
  onBack?: () => void;
  /** White round back button, for screens with a coloured hero */
  onColor?: boolean;
  /** Replaces the Emergency button, e.g. a timestamp */
  trailing?: ReactNode;
};

// Back button, title and the Emergency button, as at the top of most mockup screens.
const ScreenHeader = ({
  title,
  subtitle,
  showEmergency = true,
  backIcon = 'back',
  onBack,
  onColor = false,
  trailing,
}: ScreenHeaderProps) => {
  const { t } = useTranslation();
  const canGoBack = Boolean(onBack) || router.canGoBack();

  return (
    <View style={styles.header}>
      {canGoBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backIcon === 'close' ? t('common.close') : t('common.back')}
          onPress={onBack ?? (() => router.back())}
          style={[styles.back, onColor && styles.backOnColor]}
        >
          <Icon name={backIcon} size={22} />
        </Pressable>
      )}
      <View style={styles.titles}>
        {title ? (
          <AppText variant="h2" accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" color={colors.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? (showEmergency && <EmergencyButton />)}
    </View>
  );
};

export default ScreenHeader;

const styles = StyleSheet.create({
  header: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOnColor: { backgroundColor: colors.surface },
  titles: { flex: 1 },
  title: { fontSize: 20, color: colors.text },
});
