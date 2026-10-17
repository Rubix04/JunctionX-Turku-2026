import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PinPad from '@/components/features/pin-pad';
import StepHeader from '@/components/features/step-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon, { type IconName } from '@/components/ui/icon';
import { useAuth } from '@/context/auth-context';
import { authenticateWithBiometrics, getAvailableLockMethods } from '@/services/device-lock';
import { colors, fonts, radius, spacing } from '@/theme';
import type { LockMethod } from '@/types/auth';

const methodIcons: Record<LockMethod, IconName> = {
  face: 'face',
  fingerprint: 'fingerprint',
  pin: 'lock',
};

type Stage = 'choose' | 'enterPin' | 'confirmPin';

const SetLockScreen = () => {
  const { t } = useTranslation();
  const { pendingSignIn, finishSetup } = useAuth();
  const [methods, setMethods] = useState<LockMethod[]>(['pin']);
  const [selected, setSelected] = useState<LockMethod>('pin');
  const [stage, setStage] = useState<Stage>('choose');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Offer face / fingerprint only when this phone has them set up. Fastest one first.
  useEffect(() => {
    getAvailableLockMethods().then((available) => {
      setMethods(available);
      setSelected(available[0]);
    });
  }, []);

  // Opened without a bank sign-in, e.g. after a reload.
  if (!pendingSignIn) {
    return <Redirect href="/bank-auth" />;
  }

  const save = async (method: LockMethod, pin?: string) => {
    setSaving(true);
    try {
      await finishSetup(method, pin);
    } catch {
      setError(t('setLock.saveError'));
      setSaving(false);
    }
  };

  const continueWithSelected = async () => {
    setError(null);
    if (selected === 'pin') {
      setStage('enterPin');
      return;
    }
    const ok = await authenticateWithBiometrics(t('setLock.confirmPrompt'), t('common.cancel'));
    if (ok) {
      await save(selected);
    } else {
      setError(t('setLock.biometricFailed'));
    }
  };

  const onPinEntered = (pin: string) => {
    if (stage === 'enterPin') {
      setFirstPin(pin);
      setError(null);
      setStage('confirmPin');
    } else if (pin === firstPin) {
      save('pin', pin);
    } else {
      setFirstPin('');
      setError(t('setLock.pinMismatch'));
      setStage('enterPin');
    }
  };

  if (stage !== 'choose') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StepHeader step={2} total={2} />
        <View style={styles.pinContent}>
          <PinPad
            // New instance per stage so the dots start empty.
            key={stage}
            title={stage === 'enterPin' ? t('setLock.choosePin') : t('setLock.confirmPin')}
            onComplete={onPinEntered}
            error={error}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepHeader step={2} total={2} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.identified}>
            <Icon name="check" size={16} color={colors.green} strokeWidth={2.5} />
            <AppText variant="bodySmall" color={colors.green} style={styles.identifiedText}>
              {t('setLock.identified', { name: pendingSignIn.user.displayName })}
            </AppText>
          </View>
          <AppText variant="h1" accessibilityRole="header">
            {t('setLock.title')}
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {t('setLock.intro')}
          </AppText>
        </View>

        <View accessibilityRole="radiogroup" style={styles.options}>
          {methods.map((method) => {
            const isSelected = method === selected;
            return (
              <Pressable
                key={method}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => setSelected(method)}
                style={[styles.option, isSelected && styles.optionSelected]}
              >
                <View style={styles.optionIcon}>
                  <Icon name={methodIcons[method]} size={22} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <AppText variant="label" style={styles.optionLabel}>
                    {t(`setLock.methods.${method}.label`)}
                  </AppText>
                  <AppText variant="caption" color={colors.muted}>
                    {t(`setLock.methods.${method}.detail`)}
                  </AppText>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]} />
              </Pressable>
            );
          })}
        </View>

        {error && (
          <AppText variant="bodySmall" color={colors.red} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}

        <View style={styles.footer}>
          <Button
            label={t('setLock.continue')}
            onPress={continueWithSelected}
            disabled={saving}
            style={styles.continueButton}
          />
          <AppText variant="caption" color={colors.muted} style={styles.footnote}>
            {t('setLock.footnote')}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SetLockScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: 22,
  },
  pinContent: { flex: 1, justifyContent: 'center', paddingBottom: spacing.xxxl },
  intro: { gap: 10 },
  identified: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  identifiedText: { fontFamily: fonts.bodyBold },
  options: { gap: 10 },
  option: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionSelected: { borderWidth: 2, borderColor: colors.primary },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderDashed },
  radioSelected: { borderWidth: 7, borderColor: colors.primary },
  footer: { marginTop: 'auto', gap: spacing.md },
  continueButton: { minHeight: 54, borderRadius: radius.lg },
  footnote: { textAlign: 'center' },
});
