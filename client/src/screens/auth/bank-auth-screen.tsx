import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StepHeader from '@/components/features/step-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { getBanks } from '@/services/auth';
import { colors, radius, spacing } from '@/theme';

const BankAuthScreen = () => {
  const { t } = useTranslation();
  const { signInWithBank } = useAuth();
  const banks = useAsync(getBanks, []);
  const [signingInWith, setSigningInWith] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickBank = async (bankId: string) => {
    setSigningInWith(bankId);
    setError(null);
    try {
      await signInWithBank(bankId);
      router.push('/set-lock');
    } catch {
      setError(t('bankAuth.signInError'));
    } finally {
      setSigningInWith(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepHeader step={1} total={2} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <AppText variant="h1" accessibilityRole="header">
            {t('bankAuth.title')}
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {t('bankAuth.intro')}
          </AppText>
        </View>

        {banks.loading && <ActivityIndicator color={colors.primary} style={styles.loading} />}

        {banks.error && (
          <View style={styles.loadError}>
            <AppText variant="body" color={colors.red}>
              {t('bankAuth.loadError')}
            </AppText>
            <Button label={t('common.tryAgain')} variant="outline" onPress={banks.reload} />
          </View>
        )}

        {banks.data && (
          <View style={styles.grid}>
            {banks.data.map((bank) => (
              <Pressable
                key={bank.id}
                accessibilityRole="button"
                accessibilityState={{ disabled: signingInWith !== null, busy: signingInWith === bank.id }}
                disabled={signingInWith !== null}
                onPress={() => pickBank(bank.id)}
                style={({ pressed }) => [styles.bank, pressed && styles.pressed]}
              >
                {signingInWith === bank.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <AppText variant="label" style={styles.bankName}>
                    {bank.name}
                  </AppText>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {error && (
          <AppText variant="bodySmall" color={colors.red} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}

        <View style={styles.note}>
          <Icon name="lock" size={20} color={colors.primary} />
          <AppText variant="caption" style={styles.noteText}>
            {t('bankAuth.note')}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BankAuthScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: 22,
  },
  intro: { gap: 10 },
  loading: { marginVertical: spacing.xxl },
  loadError: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bank: {
    flexBasis: '40%', // two columns
    flexGrow: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  bankName: { textAlign: 'center' },
  note: {
    marginTop: 'auto',
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: { flex: 1, lineHeight: 19 },
  pressed: { opacity: 0.7 },
});
