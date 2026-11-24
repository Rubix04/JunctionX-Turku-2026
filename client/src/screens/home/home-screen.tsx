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
import { ListGroup, ListRow } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getSeasonalAlerts } from '@/services/alerts';
import { getCarePlan, getReminders, setReminderDone } from '@/services/care';
import { getHealthStatus } from '@/services/health';
import { getPolicies } from '@/services/insurance';
import { getPets } from '@/services/pets';
import { getVetServices } from '@/services/vet-services';
import { colors, radius, spacing } from '@/theme';
import type { SeasonalAlert } from '@/types/alerts';
import type { CarePlan } from '@/types/care';
import type { HealthStatus } from '@/types/health';
import type { Policy } from '@/types/insurance';
import type { Pet } from '@/types/pet';
import type { VetService } from '@/types/vet-service';
import { daysBetween, formatDayMonth, formatEuros, formatTime, localize, todayIso } from '@/utils/format';

const loadHome = async () => {
  const pets = await getPets();
  const [statuses, carePlans, alerts, reminders, policies, services] = await Promise.all([
    Promise.all(pets.map((pet) => getHealthStatus(pet.id))),
    Promise.all(pets.map((pet) => getCarePlan(pet.id))),
    Promise.all(pets.map((pet) => getSeasonalAlerts(pet).catch(() => []))),
    getReminders(),
    getPolicies(),
    getVetServices(),
  ]);
  return { pets, statuses, carePlans, alerts, reminders, policies, services };
};

// Health status of the selected pet, and the two things done most: today's log and a vet visit.
const StatusCard = ({ pet, status }: { pet: Pet; status: HealthStatus }) => {
  const { t } = useTranslation();
  const watchList = status.watchList;
  const loggedToday = status.latestLog?.date === todayIso();

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('home.viewDetails')}
        onPress={() => router.push(`/pet/${pet.id}/watch-list`)}
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
      <View style={styles.actions}>
        <Button
          label={t(loggedToday ? 'home.loggedToday' : 'pet.logToday')}
          icon={loggedToday ? 'check' : 'edit'}
          variant={loggedToday ? 'outline' : 'primary'}
          onPress={() =>
            router.push(loggedToday ? `/pet/${pet.id}/log-result?level=${status.level}` : `/pet/${pet.id}/log`)
          }
          style={styles.flex}
        />
        <Button
          label={t('home.addVisit')}
          icon="plus"
          variant="outline"
          onPress={() => router.push(`/add-visit?petId=${pet.id}`)}
          style={styles.flex}
        />
      </View>
    </Card>
  );
};

// What the vet told to do at home, from the latest care plan.
const CareSection = ({ pet, plan }: { pet: Pet; plan: CarePlan }) => {
  const { t } = useTranslation();
  if (!plan.homeCare.length) return null;

  return (
    <>
      <SectionLabel
        label={t('home.careAdvice')}
        action={{ label: t('home.wholePlan'), href: `/pet/${pet.id}/care-plan` }}
      />
      <ListGroup>
        {plan.homeCare.slice(0, 3).map((item) => (
          <View key={item} style={styles.careRow}>
            <Icon name="check" size={18} color={colors.primary} />
            <AppText style={styles.flex}>{item}</AppText>
          </View>
        ))}
      </ListGroup>
    </>
  );
};

// Seasonal risks right now (spec 9), e.g. road salt in winter or ticks in spring.
const seasonIcons = { winter: 'snowflake', spring: 'sprout', summer: 'sun', autumn: 'leaf' } as const;

const AlertCard = ({ alert }: { alert: SeasonalAlert }) => {
  return (
    <Card style={styles.alert}>
      <View style={styles.row}>
        <IconTile name={seasonIcons[alert.season]} tone="amber" />
        <AppText variant="label" style={styles.flex}>
          {alert.title}
        </AppText>
      </View>
      <AppText variant="bodySmall" color={colors.textSecondary}>
        {alert.risk}
      </AppText>
      {alert.prevention.slice(0, 2).map((tip) => (
        <View key={tip} style={styles.tip}>
          <Icon name="check" size={16} color={colors.primary} />
          <AppText variant="bodySmall" style={styles.flex}>
            {tip}
          </AppText>
        </View>
      ))}
    </Card>
  );
};

// Insurance in one row; the details are on the insurance page.
const PolicyRow = ({ policy }: { policy: Policy }) => {
  const { t } = useTranslation();
  const remaining = Math.max(0, policy.coverLimit - policy.usedThisYear);
  return (
    <ListGroup>
      <ListRow
        leading={<IconTile name="shieldCheck" />}
        title={policy.plan}
        subtitle={t('home.coverLeft', { amount: formatEuros(remaining) })}
        href="/profile/insurance"
      />
    </ListGroup>
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
      onPress={() => router.push('/profile')}
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

  const { pets, statuses, carePlans, alerts, reminders, policies, services } = data;
  const index = Math.max(
    0,
    pets.findIndex((p) => p.id === selectedId),
  );
  const pet = pets[index];
  const policy = pet ? policies.find((p) => p.petId === pet.id) : undefined;
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
          <StatusCard pet={pet} status={statuses[index]} />
        ) : (
          <Card style={styles.noPets}>
            <AppText variant="title">{t('home.noPetsTitle')}</AppText>
            <AppText color={colors.textSecondary} style={styles.centerText}>
              {t('home.noPetsBody')}
            </AppText>
            <Button label={t('screens.addPet')} icon="plus" onPress={() => router.push('/add-pet')} />
          </Card>
        )}

        {pet && carePlans[index] && <CareSection pet={pet} plan={carePlans[index]} />}

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

        {pet && alerts[index].length > 0 && (
          <>
            <SectionLabel label={t('home.seasonal')} />
            {alerts[index].map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </>
        )}

        <ListGroup>
          <ListRow
            leading={<IconTile name="search" />}
            title={t('home.safeTitle')}
            subtitle={t('home.safeSubtitle')}
            href="/safe"
          />
        </ListGroup>

        <SectionLabel label={t('home.vetServices')} />
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}

        {policy && (
          <>
            <SectionLabel label={t('home.insurance')} />
            <PolicyRow policy={policy} />
          </>
        )}
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
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  careRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: 14 },
  alert: { gap: spacing.sm },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
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
