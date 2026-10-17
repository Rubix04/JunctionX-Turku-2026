import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import GivenButton from '@/components/features/given-button';
import PetSwitcher from '@/components/features/pet-switcher';
import TrafficLightBadge from '@/components/features/traffic-light-badge';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import IconTile from '@/components/ui/icon-tile';
import Pill from '@/components/ui/pill';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getReminders, setReminderDone } from '@/services/care';
import { getHealthStatus } from '@/services/health';
import { getPolicies } from '@/services/insurance';
import { getPets } from '@/services/pets';
import { getVetServices } from '@/services/vet-services';
import { colors, radius, spacing } from '@/theme';
import type { HealthStatus } from '@/types/health';
import type { Policy } from '@/types/insurance';
import type { Pet } from '@/types/pet';
import type { VetService } from '@/types/vet-service';
import { daysBetween, formatDayMonth, formatEuros, formatTime, localize, todayIso } from '@/utils/format';

const loadHome = async () => {
  const pets = await getPets();
  const [statuses, reminders, policies, services] = await Promise.all([
    Promise.all(pets.map((pet) => getHealthStatus(pet.id))),
    getReminders(),
    getPolicies(),
    getVetServices(),
  ]);
  return { pets, statuses, reminders, policies, services };
};

const PolicySection = ({ pet, policy }: { pet: Pet; policy: Policy }) => {
  const { t } = useTranslation();
  const remaining = Math.max(0, policy.coverLimit - policy.usedThisYear);

  return (
    <View style={styles.policy}>
      <View style={styles.row}>
        <IconTile name="shieldCheck" />
        <AppText variant="label" style={styles.flex}>
          {`${pet.name} · ${policy.plan}`}
        </AppText>
        <Pill label={t('home.active')} tone="green" icon="check" />
      </View>
      <View style={styles.coverTexts}>
        <AppText variant="caption" color={colors.muted}>
          {t('home.remainingCover')}
        </AppText>
        <AppText variant="title">{`${formatEuros(remaining)} / ${formatEuros(policy.coverLimit)}`}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, (remaining / policy.coverLimit) * 100)}%` }]} />
      </View>
      <Button label={t('home.submitClaim')} icon="receipt" variant="outline" onPress={() => router.push('/add-visit')} />
    </View>
  );
};

// Insurance cover and health status of the selected pet in one card. Tapping the status opens the pet page.
const PetCard = ({ pet, policy, status }: { pet: Pet; policy?: Policy; status: HealthStatus }) => {
  const { t } = useTranslation();
  const watchList = status.watchList;

  return (
    <Card>
      {policy && (
        <>
          <PolicySection pet={pet} policy={policy} />
          <View style={styles.divider} />
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('home.viewDetails')}
        onPress={() => router.push(`/pet/${pet.id}`)}
        style={({ pressed }) => [styles.status, pressed && styles.pressed]}
      >
        <View style={styles.statusTop}>
          <TrafficLightBadge level={status.level} />
          {watchList && (
            <AppText variant="caption" color={colors.muted}>
              {t('home.dayOf', {
                day: Math.min(daysBetween(watchList.startDate, todayIso()) + 1, watchList.totalDays),
                total: watchList.totalDays,
              })}
            </AppText>
          )}
        </View>
        <View style={styles.row}>
          <AppText variant="label" style={styles.flex}>
            {watchList
              ? t('home.recovering', { condition: watchList.condition.toLowerCase() })
              : t('home.allGood', { name: pet.name })}
          </AppText>
          <Icon name="chevronRight" size={20} color={colors.muted} />
        </View>
      </Pressable>
    </Card>
  );
};

const ServiceCard = ({ service }: { service: VetService }) => {
  const { t } = useTranslation();
  const [booked, setBooked] = useState(false);
  const { availability } = service;

  let when: string;
  if (availability.kind === 'queue') {
    when = t('home.approxMinutes', { minutes: availability.minutes });
  } else {
    const time = formatTime(availability.at);
    when = availability.at.startsWith(todayIso())
      ? t('home.todayAt', { time })
      : `${formatDayMonth(availability.at)} ${time}`;
  }

  return (
    <Card style={styles.service}>
      <View style={styles.serviceTop}>
        <View style={styles.serviceTexts}>
          <AppText variant="title" color={colors.primary}>
            {localize(service.title)}
          </AppText>
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {localize(service.description)}
          </AppText>
          <AppText variant="label">{service.price ? formatEuros(service.price) : t('home.included')}</AppText>
        </View>
        <View style={styles.serviceAvatar}>
          <Icon name={service.icon} size={28} color={colors.primary} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.serviceBottom}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.muted}>
            {t(availability.kind === 'queue' ? 'home.waitingTime' : 'home.nextTime')}
          </AppText>
          <AppText variant="body">{when}</AppText>
        </View>
        <Button
          label={t(booked ? 'home.booked' : 'home.book')}
          icon={booked ? 'check' : undefined}
          variant={booked ? 'outline' : 'primary'}
          onPress={() => setBooked(!booked)}
          style={styles.book}
        />
      </View>
    </Card>
  );
};

const HomeScreen = () => {
  const { t } = useTranslation();
  const { data, error, reload } = useAsync(loadHome, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useReloadOnFocus(reload);

  const settingsButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.settings')}
      onPress={() => router.push('/(tabs)/(profile)')}
      style={({ pressed }) => [styles.settings, pressed && styles.pressed]}
    >
      <Icon name="sliders" size={22} color={colors.primary} />
    </Pressable>
  );

  if (!data) {
    return (
      <Screen inTabs header={<View style={styles.header}>{settingsButton}</View>}>
        {error ? <ErrorView onRetry={reload} /> : <LoadingView />}
      </Screen>
    );
  }

  const { pets, statuses, reminders, policies, services } = data;
  const index = Math.max(
    0,
    pets.findIndex((p) => p.id === selectedId),
  );
  const pet = pets[index];
  const todaysReminders = reminders.filter((r) => r.dueAt.startsWith(todayIso()));

  const toggleDone = async (reminderId: string, done: boolean) => {
    await setReminderDone(reminderId, done);
    reload();
  };

  // Pet tabs and the settings button share the top row, so content starts higher up.
  const header = (
    <View style={styles.header}>
      <View style={styles.flex}>
        <PetSwitcher pets={pets} selectedId={pet?.id ?? null} onSelect={setSelectedId} />
      </View>
      {settingsButton}
    </View>
  );

  return (
    <Screen inTabs header={header} noPadding contentStyle={styles.content}>
      <ScreenSection>
        {pet ? (
          <PetCard pet={pet} policy={policies.find((p) => p.petId === pet.id)} status={statuses[index]} />
        ) : (
          <Card style={styles.noPets}>
            <AppText variant="title">{t('home.noPetsTitle')}</AppText>
            <AppText color={colors.textSecondary} style={styles.centerText}>
              {t('home.noPetsBody')}
            </AppText>
            <Button label={t('screens.addPet')} icon="plus" onPress={() => router.push('/add-pet')} />
          </Card>
        )}

        {todaysReminders.length > 0 && (
          <>
            <SectionLabel
              label={t('home.today')}
              action={pet ? { label: t('home.allReminders'), href: `/pet/${pet.id}/reminders` } : undefined}
            />
            {todaysReminders.map((reminder) => {
              const reminderPet = pets.find((p) => p.id === reminder.petId);
              return (
                <View key={reminder.id} style={styles.reminder}>
                  <IconTile name={reminder.kind === 'medication' ? 'pill' : 'calendar'} tone="amber" />
                  <View style={styles.flex}>
                    <AppText variant="label">{`${reminderPet?.name ?? ''} · ${reminder.title.toLowerCase()}`}</AppText>
                    <AppText variant="caption" color={colors.muted}>
                      {`${reminder.detail} · ${formatTime(reminder.dueAt)}`}
                    </AppText>
                  </View>
                  {reminder.kind === 'medication' && (
                    <GivenButton
                      given={reminder.done}
                      medicineName={reminder.title}
                      onToggle={() => toggleDone(reminder.id, !reminder.done)}
                    />
                  )}
                </View>
              );
            })}
          </>
        )}

        <SectionLabel label={t('home.vetServices')} />
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </ScreenSection>
    </Screen>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingRight: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  settings: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { gap: spacing.lg },
  policy: { gap: spacing.md },
  coverTexts: { gap: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.primaryTint, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  divider: { height: 1, backgroundColor: colors.divider },
  status: { gap: spacing.sm },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noPets: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  reminder: {
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
  service: { gap: spacing.md },
  serviceTop: { flexDirection: 'row', gap: spacing.md },
  serviceTexts: { flex: 1, gap: spacing.xs },
  serviceAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  book: { minWidth: 110, borderRadius: radius.pill },
});
