import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppLogo from '@/components/features/app-logo';
import LanguageSwitcher from '@/components/features/language-switcher';
import VideoBackground from '@/components/features/video-background';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import { colors, fonts, spacing } from '@/theme';

const backgroundVideo = require('../../../assets/videos/splash-loop.mp4');
const backgroundPoster = require('../../../assets/videos/poster.jpg');

// First screen when signed out: video background, BankID, email sign-in and sign-up.
const LandingScreen = () => {
  const { t } = useTranslation();

  return (
    <VideoBackground source={backgroundVideo} poster={backgroundPoster} shiftUp={0.2}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <LanguageSwitcher tone="onDark" />
        </View>

        <View style={styles.brand}>
          <AppLogo size={84} variant="light" />
          <AppText style={styles.wordmark} accessibilityRole="header">
            Tassu
            <AppText style={[styles.wordmark, styles.wordmarkAccent]}>Vahti</AppText>
          </AppText>
          <AppText variant="body" color={colors.onDark} style={styles.slogan}>
            {t('splash.slogan')}
          </AppText>
        </View>

        <View style={styles.actions}>
          <Button
            label={t('auth.landing.bankId')}
            icon="shieldCheck"
            variant="light"
            size="large"
            onPress={() => router.push('/bank-id')}
          />
          <Button
            label={t('auth.landing.emailSignIn')}
            variant="lightOutline"
            size="large"
            onPress={() => router.push('/sign-in')}
          />
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/sign-up')}
            hitSlop={8}
            style={styles.signUpLink}
          >
            <AppText variant="bodySmall" color={colors.onDarkMuted}>
              {t('auth.landing.newHere')}{' '}
              <AppText variant="label" color={colors.onDark} style={styles.underline}>
                {t('auth.landing.createAccount')}
              </AppText>
            </AppText>
          </Pressable>
          <AppText variant="caption" color={colors.onDarkFaint} style={styles.terms}>
            {t('auth.landing.terms')}
          </AppText>
        </View>
      </SafeAreaView>
    </VideoBackground>
  );
};

export default LandingScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: spacing.xxl },
  topBar: { paddingTop: spacing.sm, flexDirection: 'row' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  wordmark: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1.2,
    color: colors.onDark,
  },
  wordmarkAccent: { color: colors.accent },
  slogan: { textAlign: 'center', fontSize: 17, lineHeight: 25, maxWidth: 290 },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
  signUpLink: { alignItems: 'center', paddingVertical: spacing.sm },
  underline: { textDecorationLine: 'underline' },
  terms: { textAlign: 'center', lineHeight: 18 },
});
