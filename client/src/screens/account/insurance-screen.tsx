import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Pill from '@/components/ui/pill';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getClaims, getPolicies } from '@/services/insurance';
import { getPets } from '@/services/pets';
import { colors, radius, spacing } from '@/theme';
import type { ClaimStatus } from '@/types/insurance';
import { formatDayMonth, formatEuros } from '@/utils/format';

const loadInsurance = async () => {
  const [pets, policies, claims] = await Promise.all([getPets(), getPolicies(), getClaims()]);
  return { pets, policies, claims };
};

const claimTones: Record<ClaimStatus, 'green' | 'amber' | 'red'> = { paid: 'green', inReview: 'amber', needsInfo: 'red' };

// Policies and claims from the insurer's systems.
const InsuranceScreen = () => {
  const { t } = useTranslation();
  const { data, error, reload } = useAsync(loadInsurance, []);

  const header = <ScreenHeader title={t('screens.insurance')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pets, policies, claims } = data;
  const petName = (id: string) => pets.find((p) => p.id === id)?.name ?? '';

  return (
    <Screen header={header}>
      <SectionLabel label={t('insurance.policies')} />
      {policies.length ? (
        policies.map((policy, index) =>
          index === 0 ? (
            <View key={policy.id} style={styles.policy}>
              <View style={styles.policyTop}>
                <AppText variant="label" color={colors.onDark} style={styles.flex}>
                  {t('insurance.petInsurance', { name: petName(policy.petId) })}
                </AppText>
                <AppText variant="caption" color={colors.primaryLightMuted}>
                  {policy.number}
                </AppText>
              </View>
              <View style={styles.policyFacts}>
                <View style={styles.flex}>
                  <AppText variant="caption" color={colors.primaryLightMuted}>
                    {t('insurance.cover')}
                  </AppText>
                  <AppText variant="label" color={colors.onDark}>
                    {t('insurance.perYear', { amount: formatEuros(policy.coverLimit) })}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="caption" color={colors.primaryLightMuted}>
                    {t('insurance.used')}
                  </AppText>
                  <AppText variant="label" color={colors.onDark}>
                    {formatEuros(policy.usedThisYear)}
                  </AppText>
                </View>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, (policy.usedThisYear / policy.coverLimit) * 100)}%` }]} />
              </View>
            </View>
          ) : (
            <ListGroup key={policy.id}>
              <ListRow
                title={t('insurance.petInsurance', { name: petName(policy.petId) })}
                subtitle={t('insurance.usedOf', {
                  used: formatEuros(policy.usedThisYear),
                  limit: formatEuros(policy.coverLimit),
                })}
                trailing={
                  <AppText variant="caption" color={colors.muted}>
                    {policy.number}
                  </AppText>
                }
              />
            </ListGroup>
          ),
        )
      ) : (
        <EmptyView title={t('insurance.noPolicies')} />
      )}

      <SectionLabel label={t('insurance.claims')} />
      {claims.length ? (
        <ListGroup>
          {claims.map((claim) => (
            <ListRow
              key={claim.id}
              title={`${petName(claim.petId)} · ${claim.title.toLowerCase()}`}
              subtitle={`${formatDayMonth(claim.date)} · ${t(`insurance.channel.${claim.channel}`)}`}
              trailing={<Pill label={t(`insurance.status.${claim.status}`)} tone={claimTones[claim.status]} />}
            />
          ))}
        </ListGroup>
      ) : (
        <EmptyView title={t('insurance.noClaims')} />
      )}

      <Button label={t('insurance.makeClaim')} icon="receipt" onPress={() => router.push('/add-visit')} />

      <Pressable accessibilityRole="link" onPress={() => router.push('/(tabs)/(map)')} style={styles.directNote}>
        <Icon name="shieldCheck" size={20} color={colors.primary} />
        <AppText variant="bodySmall" color={colors.noteText} style={styles.flex}>
          {t('insurance.directPaymentNote')}
        </AppText>
        <Icon name="chevronRight" size={18} color={colors.primary} />
      </Pressable>
      <View style={styles.lockRow}>
        <Icon name="lock" size={16} color={colors.muted} />
        <AppText variant="caption" color={colors.muted}>
          {t('insurance.bankIdNote')}
        </AppText>
      </View>
    </Screen>
  );
};

export default InsuranceScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  policy: { padding: spacing.lg, borderRadius: 18, backgroundColor: colors.primary, gap: 10 },
  policyTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  policyFacts: { flexDirection: 'row', gap: spacing.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.primaryDark, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  directNote: {
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
