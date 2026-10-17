import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import Disclaimer from '@/components/features/disclaimer';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import IconTile from '@/components/ui/icon-tile';
import { DateTile, ListGroup, ListRow } from '@/components/ui/list-group';
import Pill from '@/components/ui/pill';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { addReminder, getCarePlan, getReminders, getVisits } from '@/services/care';
import { getPet } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import {
  formatDayMonth,
  formatLongDate,
  formatMonthShort,
  formatShortWeekdayDate,
  formatTime,
  parseDate,
} from '@/utils/format';

const loadPlan = async (petId: string) => {
  const [pet, plan, visits, reminders] = await Promise.all([
    getPet(petId),
    getCarePlan(petId),
    getVisits(petId),
    getReminders(petId),
  ]);
  return { pet, plan, visits, reminders };
};

const homeCareIcons = ['pill', 'droplet', 'list'] as const;

// The vet's notes in plain language (spec 2): found, what to do at home, follow-up.
const CarePlanScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadPlan(petId), [petId]);
  const [originalOpen, setOriginalOpen] = useState(false);
  useReloadOnFocus(reload);

  const header = <ScreenHeader title={t('screens.carePlan')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pet, plan, visits, reminders } = data;
  if (!plan) {
    return (
      <Screen header={header}>
        <EmptyView title={t('carePlan.noneTitle')} body={t('carePlan.noneBody', { name: pet.name })} />
        <Button label={t('screens.addVisit')} icon="plus" onPress={() => router.push(`/add-visit?petId=${petId}`)} />
      </Screen>
    );
  }

  const visit = visits.find((v) => v.id === plan.visitId);
  const followUp = plan.followUp;
  const followUpReminder = followUp && reminders.find((r) => r.dueAt === followUp.dateTime);

  const remindFollowUp = async () => {
    if (!followUp) return;
    await addReminder({
      petId,
      kind: 'visit',
      title: followUp.title,
      detail: followUp.clinicName,
      dueAt: followUp.dateTime,
    });
    reload();
  };

  return (
    <Screen header={header}>
      <View style={styles.hero}>
        <AppText variant="caption" color={colors.primaryLightMuted}>
          {visit ? t('carePlan.visitOn', { name: pet.name, date: formatLongDate(visit.date) }) : pet.name}
        </AppText>
        <AppText variant="h2" color={colors.onDark}>
          {plan.diagnosis}
        </AppText>
        <AppText variant="bodySmall" color={colors.primaryLight}>
          {`${plan.clinicName} · ${plan.vetName}`}
        </AppText>
        <View style={styles.heroPill}>
          <Pill
            tone={plan.checkedByClinic ? 'white' : 'amber'}
            icon={plan.checkedByClinic ? 'shieldCheck' : 'clock'}
            label={plan.checkedByClinic ? t('carePlan.checked') : t('carePlan.draft')}
          />
        </View>
      </View>

      <SectionLabel label={t('carePlan.found')} />
      <AppText style={styles.paragraph}>{plan.findings}</AppText>

      <SectionLabel label={t('carePlan.atHome')} />
      <ListGroup>
        {plan.homeCare.map((item, index) => (
          <View key={item} style={styles.homeRow}>
            <Icon name={homeCareIcons[index] ?? 'check'} size={20} color={colors.primary} />
            <AppText style={styles.flex}>{item}</AppText>
          </View>
        ))}
      </ListGroup>

      {followUp && (
        <>
          <SectionLabel label={t('carePlan.followUp')} />
          <ListGroup>
            <ListRow
              leading={
                <DateTile
                  day={String(parseDate(followUp.dateTime).getDate())}
                  month={formatMonthShort(followUp.dateTime)}
                  tint={colors.accentTint}
                />
              }
              title={followUp.title}
              subtitle={`${formatShortWeekdayDate(followUp.dateTime)} ${formatTime(followUp.dateTime)} · ${followUp.clinicName}`}
              trailing={
                followUpReminder ? (
                  <Pill label={t('carePlan.reminderOn')} tone="green" icon="check" />
                ) : (
                  <Button label={t('carePlan.remindMe')} variant="tealOutline" size="small" onPress={remindFollowUp} />
                )
              }
            />
          </ListGroup>
        </>
      )}

      {plan.products.length > 0 && (
        <>
          <SectionLabel label={t('carePlan.recommended')} />
          {plan.products.map((product) => (
            <View key={product.productId} style={styles.product}>
              <IconTile name={product.prescription ? 'pill' : 'bowl'} tone={product.prescription ? 'amber' : 'teal'} size={44} />
              <View style={styles.flex}>
                <AppText variant="label">
                  {product.prescription ? t('carePlan.prescription', { name: product.name }) : product.name}
                </AppText>
                <AppText variant="caption" color={colors.muted}>
                  {product.prescription
                    ? product.prescription.pickedUpOn
                      ? t('carePlan.pickedUp', {
                          place: product.prescription.issuedTo,
                          date: formatDayMonth(product.prescription.pickedUpOn),
                        })
                      : t('carePlan.pickUp', { place: product.prescription.issuedTo })
                    : product.brand}
                </AppText>
              </View>
              {!product.prescription && (
                <Button
                  label={t('carePlan.findInStore')}
                  variant="tealOutline"
                  size="small"
                  onPress={() => router.push(`/find-in-store?productId=${product.productId}`)}
                />
              )}
            </View>
          ))}
        </>
      )}

      <View style={styles.original}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: originalOpen }}
          onPress={() => setOriginalOpen(!originalOpen)}
          style={styles.originalHeader}
        >
          <AppText variant="label" style={styles.flex}>
            {t('carePlan.original')}
          </AppText>
          <Icon name="chevronDown" size={18} color={colors.muted} />
        </Pressable>
        {originalOpen && (
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {plan.originalText}
          </AppText>
        )}
      </View>
      <Disclaimer kind="app" />
    </Screen>
  );
};

export default CarePlanScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { padding: spacing.lg, borderRadius: 18, backgroundColor: colors.primary, gap: 6 },
  heroPill: { marginTop: spacing.xs },
  paragraph: { lineHeight: 23 },
  homeRow: { padding: spacing.md, paddingHorizontal: 14, flexDirection: 'row', gap: spacing.md },
  product: {
    padding: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  original: {
    padding: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  originalHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center' },
  bold: { fontFamily: fonts.bodyBold },
});
