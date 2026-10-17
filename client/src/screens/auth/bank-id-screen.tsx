import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import Screen from '@/components/ui/screen';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { getBanks } from '@/services/auth';
import { colors, radius, spacing } from '@/theme';

// BankID: pick a bank, confirm in the bank's app (simulated), then the app opens.
const BankIdScreen = () => {
  const { t } = useTranslation();
  const { signInWithBank } = useAuth();
  const banks = useAsync(getBanks, []);
  const [signingInWith, setSigningInWith] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickBank = async (bankId: string) => {
    setSigningInWith(bankId);
    setError(null);
    try {
      // The root layout switches to the tabs once signed in.
      await signInWithBank(bankId);
    } catch {
      setError(t('auth.bankId.signInError'));
      setSigningInWith(null);
    }
  };

  return (
    <Screen header={<ScreenHeader />} contentStyle={styles.content}>
      <View style={styles.intro}>
        <View style={styles.badge}>
          <Icon name="shieldCheck" size={28} color={colors.primary} />
        </View>
        <AppText variant="h1" accessibilityRole="header">
          {t('auth.bankId.title')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {t('auth.bankId.intro')}
        </AppText>
      </View>

      {banks.loading && <ActivityIndicator color={colors.primary} style={styles.loading} />}

      {banks.error && (
        <View style={styles.loadError}>
          <AppText variant="body" color={colors.red}>
            {t('auth.bankId.loadError')}
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
              style={({ pressed }) => [
                styles.bank,
                signingInWith === bank.id && styles.bankActive,
                pressed && styles.pressed,
              ]}
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

      {signingInWith && (
        <AppText variant="bodySmall" color={colors.primary} accessibilityLiveRegion="polite">
          {t('auth.bankId.waiting')}
        </AppText>
      )}

      {error && (
        <AppText variant="bodySmall" color={colors.red} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}

      <View style={styles.note}>
        <Icon name="lock" size={20} color={colors.primary} />
        <AppText variant="caption" color={colors.noteText} style={styles.noteText}>
          {t('auth.bankId.note')}
        </AppText>
      </View>
    </Screen>
  );
};

export default BankIdScreen;

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl, gap: 22 },
  intro: { gap: 10 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  bankActive: { borderColor: colors.primary, borderWidth: 1.5 },
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
