import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import GivenButton from '@/components/features/given-button';
import PetSwitcher from '@/components/features/pet-switcher';
import TrafficLightBadge from '@/components/features/traffic-light-badge';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import IconTile from '@/components/ui/icon-tile';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getReminders, setReminderDone } from '@/services/care';
import { getSeasonalAlerts, seasonFor } from '@/services/content';
import { getHealthStatus, getLogQuestions } from '@/services/health';
import { getPets } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { HealthStatus, LogQuestion } from '@/types/health';
import type { Pet } from '@/types/pet';
import { daysBetween, formatTime, formatWeekdayDate, localize, todayIso } from '@/utils/format';

const loadHome = async () => {
  const pets = await getPets();
  const [statuses, questions, reminders, alerts] = await Promise.all([
    Promise.all(pets.map((pet) => getHealthStatus(pet.id))),
    Promise.all(pets.map((pet) => getLogQuestions(pet.id))),
    getReminders(),
    getSeasonalAlerts([...new Set(pets.map((pet) => pet.species))]),
  ]);
  return { pets, statuses, questions, reminders, alerts };
};

/** "Water intake: More, Litter box trips: Fewer" for the answers that weren't as usual */
const flaggedAnswers = (status: HealthStatus, questions: LogQuestion[]) =>
  questions
    .filter((q) => {
      const answer = status.latestLog?.answers[q.id];
      return answer !== undefined && (q.yellowIf.includes(answer) || q.redIf.includes(answer));
    })
    .map((q) => `${q.label}: ${q.options[status.latestLog!.answers[q.id]]}`);

const StatusCard = ({ pet, status, questions }: { pet: Pet; status: HealthStatus; questions: LogQuestion[] }) => {
  const { t } = useTranslation();
  const today = todayIso();
  const watchList = status.watchList;
  const loggedToday = status.latestLog?.date === today;
  const flagged = flaggedAnswers(status, questions);

  let summary: string;
  if (!status.latestLog) {
    summary = t('home.noLogYet', { name: pet.name });
  } else if (flagged.length) {
    summary = t(loggedToday ? 'home.flaggedToday' : 'home.flaggedLastLog', { items: flagged.join(', ') });
  } else {
    summary = t(loggedToday ? 'home.asUsualToday' : 'home.asUsualLastLog', { name: pet.name });
  }

  return (
    <Card>
      <View style={styles.statusTop}>
        <TrafficLightBadge level={status.level} />
        {watchList && (
          <AppText variant="caption" color={colors.muted}>
            {t('home.dayOf', {
              day: Math.min(daysBetween(watchList.startDate, today) + 1, watchList.totalDays),
              total: watchList.totalDays,
            })}
          </AppText>
        )}
      </View>
      <View style={styles.statusTexts}>
        <AppText variant="title">
          {watchList ? t('home.recovering', { condition: watchList.condition.toLowerCase() }) : t('home.noWatchList')}
        </AppText>
        <AppText variant="bodySmall" color={colors.textSecondary}>
          {watchList || status.latestLog ? summary : t('home.noWatchListBody', { name: pet.name })}
        </AppText>
      </View>
      {watchList && (
        <View style={styles.chips}>
          {watchList.questions.map((q) => (
            <Chip key={q.id} label={q.label} />
          ))}
        </View>
      )}
      <View style={styles.statusActions}>
        <Button
          label={loggedToday ? t('home.updateLog') : t('home.logToday')}
          onPress={() => router.push(`/pet/${pet.id}/log`)}
          style={styles.flex}
        />
        <Button
          label={t('home.petPage', { name: pet.name })}
          variant="outline"
          onPress={() => router.push(`/pet/${pet.id}`)}
        />
      </View>
    </Card>
  );
};

const HomeScreen = () => {
  const { t } = useTranslation();
  const { displayName } = useAuth();
  const { data, error, loading, reload } = useAsync(loadHome, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useReloadOnFocus(reload);

  const header = (
    <View style={styles.header}>
      <View style={styles.flex}>
        <AppText variant="bodySmall" color={colors.muted}>
          {formatWeekdayDate(todayIso())}
        </AppText>
        <AppText variant="h1" accessibilityRole="header">
          {t('home.greeting', { name: displayName?.split(' ')[0] ?? '' })}
        </AppText>
      </View>
    </View>
  );

  if (!data) {
    return (
      <Screen inTabs header={header}>
        {error ? <ErrorView onRetry={reload} /> : <LoadingView />}
      </Screen>
    );
  }

  const { pets, statuses, questions, reminders, alerts } = data;
  const index = Math.max(
    0,
    pets.findIndex((p) => p.id === selectedId),
  );
  const pet = pets[index];
  const today = todayIso();
  const todaysReminders = reminders.filter((r) => r.dueAt.startsWith(today));
  const season = seasonFor();
  const seasonal = alerts.find((a) => a.season === season && (!pet || a.species.includes(pet.species)));

  const toggleDone = async (reminderId: string, done: boolean) => {
    await setReminderDone(reminderId, done);
    reload();
  };

  return (
    <Screen inTabs header={header} noPadding contentStyle={styles.content}>
      <PetSwitcher pets={pets} selectedId={pet?.id ?? null} onSelect={setSelectedId} />

      <ScreenSection>
        {pet ? (
          <StatusCard pet={pet} status={statuses[index]} questions={questions[index]} />
        ) : (
          <Card style={styles.noPets}>
            <AppText variant="title">{t('home.noPetsTitle')}</AppText>
            <AppText color={colors.textSecondary} style={styles.centerText}>
              {t('home.noPetsBody')}
            </AppText>
            <Button label={t('screens.addPet')} icon="plus" onPress={() => router.push('/add-pet')} />
          </Card>
        )}

        <SectionLabel
          label={t('home.today')}
          action={pet ? { label: t('home.allReminders'), href: `/pet/${pet.id}/reminders` } : undefined}
        />
        {loading && !todaysReminders.length ? null : todaysReminders.length ? (
          todaysReminders.map((reminder) => {
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
          })
        ) : (
          <EmptyView title={t('home.nothingToday')} />
        )}

        {seasonal && (
          <View style={styles.seasonal}>
            <IconTile name="leaf" tone="dark" />
            <View style={styles.flex}>
              <AppText variant="label" color={colors.onDark}>
                {`${t(`seasons.${season}`)}: ${localize(seasonal.title).toLowerCase()}`}
              </AppText>
              <AppText variant="caption" color={colors.onDarkMuted}>
                {t('home.seasonalHint')}
              </AppText>
            </View>
          </View>
        )}
      </ScreenSection>
    </Screen>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { gap: spacing.lg },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusTexts: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusActions: { flexDirection: 'row', gap: 10 },
  noPets: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
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
  seasonal: {
    padding: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bold: { fontFamily: fonts.bodyBold },
});
