import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppLogo from '@/components/features/app-logo';
import AppText from '@/components/ui/app-text';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';

type SplashOverlayProps = {
  onContinue: () => void;
};

// Branded splash shown over the app on every launch until the user taps.
const SplashOverlay = ({ onContinue }: SplashOverlayProps) => {
  const { t } = useTranslation();

  return (
    <Animated.View exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
      <StatusBar style="light" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('splash.continue')}
        onPress={onContinue}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.brand}>
            <AppLogo size={128} variant="light" />
            <AppText style={styles.wordmark} accessibilityRole="header">
              Tassu
              <AppText style={[styles.wordmark, styles.wordmarkAccent]}>Vahti</AppText>
            </AppText>
            <AppText variant="body" color={colors.onDark} style={styles.tagline}>
              {t('common.tagline')}
            </AppText>
          </View>

          <View style={styles.footer}>
            <View style={styles.continueButton}>
              <AppText variant="label" color={colors.onDark}>
                {t('splash.continue')}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.primaryLight}>
              {t('splash.by')}
            </AppText>
          </View>
        </SafeAreaView>
      </Pressable>
    </Animated.View>
  );
};

export default SplashOverlay;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  safeArea: { flex: 1, paddingHorizontal: spacing.xxl },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  wordmark: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1.2,
    color: colors.onDark,
  },
  wordmarkAccent: { color: colors.accent },
  tagline: { textAlign: 'center', fontSize: 17, lineHeight: 25, maxWidth: 280 },
  footer: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  continueButton: {
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
