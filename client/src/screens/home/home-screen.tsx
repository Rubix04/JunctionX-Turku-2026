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
import { ListGroup } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getSeasonalAlerts } from '@/services/alerts';
import { getCarePlan, getReminders, setReminderDone } from '@/services/care';
import { getHealthStatus } from '@/services/health';
import { getInsights } from '@/services/insights';
import { getPolicies } from '@/services/insurance';
import { getPets } from '@/services/pets';
import { colors, fonts, spacing } from '@/theme';
import type { SeasonalAlert } from '@/types/alerts';
import type { HealthStatus } from '@/types/health';
import type { Policy } from '@/types/insurance';
import type { Pet } from '@/types/pet';
import { daysBetween, formatEuros, formatTime, todayIso } from '@/utils/format';

const loadHome = async () => {
  const pets = await getPets();
  const [statuses, carePlans, alerts, reminders, policies] = await Promise.all([
    Promise.all(pets.map((pet) => getHealthStatus(pet.id))),
    Promise.all(pets.map((pet) => getCarePlan(pet.id))),
    Promise.all(pets.map((pet) => getSeasonalAlerts(pet).catch(() => []))),
    getReminders(),
    getPolicies(),
  ]);
  return { pets, statuses, carePlans, alerts, reminders, policies };
};

// Health status of the selected pet, and the two things done most: today's log and a vet visit.
const StatusCard = ({ pet, status }: { pet: Pet; status: HealthStatus }) => {
  const { t } = useTranslation();
  const watchList = status.watchList;
  const loggedToday = status.latestLog?.date === todayIso();
  // The AI analysis comes a moment later; until then the rules' level shows.
  const { data: insight } = useAsync(() => getInsights(pet.id), [pet.id, status]);
  const level = insight?.level ?? status.level;

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('home.viewDetails')}
        onPress={() => router.push(`/pet/${pet.id}/watch-list`)}
        style={({ pressed }) => [styles.status, pressed && styles.pressed]}
      >
        <View style={styles.statusTop}>
          <TrafficLightBadge level={level} />
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
        {insight ? (
          <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
            {`✦ ${insight.raisedByAi ? `${t('insights.noticed')}: ` : ''}${insight.summary} `}
            <AppText variant="bodySmall" color={colors.primary}>
              {t('insights.why')}
            </AppText>
          </AppText>
        ) : (
          <AppText variant="caption" color={colors.muted}>
            {`✦ ${t('insights.analysing')}`}
          </AppText>
        )}
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

// Seasonal risks right now (spec 9), e.g. road salt in winter or ticks in spring.
const seasonIcons = { winter: 'snowflake', spring: 'sprout', summer: 'sun', autumn: 'leaf' } as const;

// One line per alert; tapping it opens the risk and two tips.
const AlertRow = ({ alert }: { alert: SeasonalAlert }) => {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={({ pressed }) => [styles.alert, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Icon name={seasonIcons[alert.season]} size={18} color={colors.yellowText} />
        <AppText variant="bodySmall" style={[styles.flex, styles.alertTitle]} numberOfLines={open ? undefined : 1}>
          {alert.title}
        </AppText>
        <Icon name="chevronDown" size={16} color={colors.muted} />
      </View>
      {open && (
        <>
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
        </>
      )}
    </Pressable>
  );
};

// Insurance as one small line at the bottom; the details are on the insurance page.
const PolicyLine = ({ policy }: { policy: Policy }) => {
  const { t } = useTranslation();
  const remaining = Math.max(0, policy.coverLimit - policy.usedThisYear);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push('/profile/insurance')}
      style={({ pressed }) => [styles.policy, pressed && styles.pressed]}
    >
      <Icon name="shieldCheck" size={16} color={colors.muted} />
      <AppText variant="caption" color={colors.muted} style={styles.flex}>
        {`${policy.plan} · ${t('home.coverLeft', { amount: formatEuros(remaining) })}`}
      </AppText>
      <Icon name="chevronRight" size={16} color={colors.muted} />
    </Pressable>
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

  const { pets, statuses, carePlans, alerts, reminders, policies } = data;
  const index = Math.max(
    0,
    pets.findIndex((p) => p.id === selectedId),
  );
  const pet = pets[index];
  const policy = pet ? policies.find((p) => p.petId === pet.id) : undefined;
  const todaysReminders = reminders.filter((r) => r.dueAt.startsWith(todayIso()));
  // Today's list: reminders for all pets, then two of the selected pet's care instructions.
  const plan = pet ? carePlans[index] : null;
  const careItems = plan?.homeCare.slice(0, 2) ?? [];
  const alert = pet ? alerts[index][0] : undefined;

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

        {(todaysReminders.length > 0 || careItems.length > 0) && (
          <>
            <SectionLabel
              label={t('home.today')}
              action={
                pet && plan
                  ? { label: t('home.wholePlan'), href: `/pet/${pet.id}/care-plan` }
                  : pet
                    ? { label: t('home.allReminders'), href: `/pet/${pet.id}/reminders` }
                    : undefined
              }
            />
            <ListGroup>
              {todaysReminders.map((reminder) => {
                const reminderPet = pets.find((p) => p.id === reminder.petId);
                return (
                  <View key={reminder.id} style={styles.todayRow}>
                    <Icon name={reminder.kind === 'medication' ? 'pill' : 'calendar'} size={18} color={colors.yellowText} />
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
              {careItems.map((item) => (
                <View key={item} style={styles.todayRow}>
                  <Icon name="check" size={18} color={colors.primary} />
                  <AppText variant="bodySmall" style={styles.flex}>
                    {item}
                  </AppText>
                </View>
              ))}
            </ListGroup>
          </>
        )}

        {alert && (
          <ListGroup>
            <AlertRow alert={alert} />
          </ListGroup>
        )}

        {policy && <PolicyLine policy={policy} />}
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
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: 14 },
  policy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  alert: { paddingVertical: spacing.md, paddingHorizontal: 14, gap: spacing.sm },
  alertTitle: { fontFamily: fonts.bodyBold },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  status: { gap: spacing.sm },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noPets: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
