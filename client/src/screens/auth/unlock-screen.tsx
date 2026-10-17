import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppLogo from '@/components/features/app-logo';
import EmergencyButton from '@/components/features/emergency-button';
import PinPad from '@/components/features/pin-pad';
import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/auth-context';
import { authenticateWithBiometrics } from '@/services/device-lock';
import { colors, fonts, spacing, touchTarget } from '@/theme';

const UnlockScreen = () => {
  const { t } = useTranslation();
  const { displayName, lockMethod, checkPin, unlock, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const usesBiometrics = lockMethod === 'face' || lockMethod === 'fingerprint';

  const finishUnlock = async () => {
    setBusy(true);
    setError(null);
    try {
      // On false the session has ended and the app goes back to the welcome screen.
      await unlock();
    } catch {
      setError(t('unlock.connectionError'));
      setBusy(false);
    }
  };

  const unlockWithBiometrics = async () => {
    setError(null);
    const ok = await authenticateWithBiometrics(t('unlock.prompt'), t('common.cancel'));
    if (ok) {
      await finishUnlock();
    }
  };

  const unlockWithPin = async (pin: string) => {
    if (await checkPin(pin)) {
      await finishUnlock();
    } else {
      setError(t('unlock.wrongPin'));
    }
  };

  // Ask for face or fingerprint straight away, as the system apps do.
  useEffect(() => {
    if (usesBiometrics) {
      unlockWithBiometrics();
    }
    // Only on first open; the button below asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <EmergencyButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greeting}>
          <AppLogo size={72} variant="light" />
          <AppText
            variant="h1"
            color={colors.onDark}
            accessibilityRole="header"
            style={styles.title}
          >
            {displayName
              ? t('unlock.welcomeBack', { name: displayName.split(' ')[0] })
              : t('unlock.welcomeBackNoName')}
          </AppText>
          <AppText variant="body" color={colors.primarySoft} style={styles.center}>
            {t('common.tagline')}
          </AppText>
        </View>

        {busy ? (
          <ActivityIndicator color={colors.onDark} size="large" style={styles.busy} />
        ) : usesBiometrics ? (
          <View style={styles.biometric}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(`unlock.${lockMethod}Button`)}
              onPress={unlockWithBiometrics}
              style={({ pressed }) => [styles.biometricButton, pressed && styles.pressed]}
            >
              <Icon name={lockMethod} size={48} color={colors.primary} strokeWidth={1.8} />
            </Pressable>
            <AppText variant="label" color={colors.onDark}>
              {t(`unlock.${lockMethod}Hint`)}
            </AppText>
            {error && (
              <AppText variant="bodySmall" color={colors.primarySoft} style={styles.center}>
                {error}
              </AppText>
            )}
          </View>
        ) : (
          <PinPad title={t('unlock.enterPin')} onComplete={unlockWithPin} error={error} tone="dark" />
        )}

        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={styles.signInAgain}
          disabled={busy}
        >
          <AppText variant="label" color={colors.onDark} style={styles.link}>
            {t('unlock.signInAgain')}
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UnlockScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  header: { paddingHorizontal: spacing.lg, alignItems: 'flex-end' },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xxxl,
  },
  greeting: { alignItems: 'center', gap: 18 },
  title: { fontSize: 28, textAlign: 'center' },
  center: { textAlign: 'center' },
  busy: { marginTop: spacing.xxxl },
  biometric: { marginTop: 'auto', alignItems: 'center', gap: 14 },
  biometricButton: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInAgain: {
    minHeight: touchTarget,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 'auto',
  },
  link: { fontFamily: fonts.bodyBold, textDecorationLine: 'underline' },
  pressed: { opacity: 0.85 },
});
