import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import GivenButton from '@/components/features/given-button';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import IconTile from '@/components/ui/icon-tile';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { getMedicationCourse, getReminders, getVisits, setReminderDone } from '@/services/care';
import { getClinics } from '@/services/clinics';
import { mockHousehold } from '@/services/mock/data';
import { getPets } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { ReminderKind, Visit } from '@/types/care';
import type { Clinic } from '@/types/clinic';
import type { Pet } from '@/types/pet';
import { daysBetween, formatShortWeekdayDate, formatTime, todayIso } from '@/utils/format';

const loadReminders = async (petId: string) => {
  const [pets, reminders, course, clinics] = await Promise.all([
    getPets(),
    getReminders(),
    getMedicationCourse(petId),
    getClinics(),
  ]);
  // Each pet's visits, newest first, to find the clinic it usually goes to.
  const visits = await Promise.all(pets.map((p) => getVisits(p.id).catch((): Visit[] => [])));
  const visitsByPet = Object.fromEntries(pets.map((p, i) => [p.id, visits[i]]));
  return { pets, reminders, course, clinics, visitsByPet };
};

/**
 * Where "Book" goes: the clinic of the pet's latest visit, if it treats the species and takes bookings.
 * Otherwise the Clinics tab, filtered to contracted clinics that treat the species.
 */
const bookingHref = (
  pet: Pet | undefined,
  clinics: Clinic[],
  visits: Visit[],
  what: string,
): Href => {
  const usual = pet
    ? visits
        .map((v) => clinics.find((c) => c.name === v.clinicName))
        .find((c) => c && c.bookingUrl && c.species.includes(pet.species))
    : undefined;
  if (usual) {
    return { pathname: '/clinic/[id]', params: { id: usual.id, for: what } };
  }
  return { pathname: '/explore', params: { mode: 'book', for: what, ...(pet ? { species: pet.species } : {}) } };
};

const kindIcons: Record<ReminderKind, 'pill' | 'calendar' | 'shieldCheck' | 'leaf'> = {
  medication: 'pill',
  visit: 'calendar',
  vaccination: 'shieldCheck',
  deworming: 'leaf',
};

// Medication doses with "did you already give it?", follow-ups and vaccinations (spec 2).
// The whole family sees the same reminders.
const RemindersScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { displayName } = useAuth();
  const { data, error, reload } = useAsync(() => loadReminders(petId), [petId]);

  const header = <ScreenHeader title={t('screens.reminders')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pets, reminders, course, clinics, visitsByPet } = data;
  const petName = (id: string) => pets.find((p) => p.id === id)?.name ?? '';
  const today = todayIso();
  const todays = reminders.filter((r) => r.dueAt.startsWith(today));
  // Missed visits and vaccinations stay on the list (marked overdue) until done; a missed dose can't be given later.
  const upcoming = reminders
    .filter((r) => !r.done && (r.dueAt.slice(0, 10) > today || (r.dueAt.slice(0, 10) < today && r.kind !== 'medication')))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const coursePet = pets.find((p) => p.id === petId);

  const toggle = async (id: string, done: boolean) => {
    await setReminderDone(id, done, displayName);
    reload();
  };

  return (
    <Screen header={header}>
      {course && coursePet && (
        <View style={styles.course}>
          <View style={styles.courseTitle}>
            <AppText variant="label" style={styles.flex}>
              {t('reminders.course', { name: coursePet.name, medicine: course.name.toLowerCase() })}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {t('home.dayOf', {
                day: Math.min(daysBetween(course.startDate, today) + 1, course.totalDays),
                total: course.totalDays,
              })}
            </AppText>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: course.dosesTotal, now: course.dosesGiven }}
          >
            <View style={[styles.fill, { width: `${(course.dosesGiven / course.dosesTotal) * 100}%` }]} />
          </View>
          <AppText variant="caption" color={colors.muted}>
            {t('reminders.dosesGiven', { given: course.dosesGiven, total: course.dosesTotal })}
          </AppText>
        </View>
      )}

      <SectionLabel label={t('home.today')} />
      {todays.length ? (
        todays.map((r) => (
          <View key={r.id} style={styles.dose}>
            <AppText variant="title" style={styles.time}>
              {formatTime(r.dueAt)}
            </AppText>
            <View style={styles.flex}>
              <AppText variant="label">{`${petName(r.petId)} · ${r.title.toLowerCase()}`}</AppText>
              <AppText variant="caption" color={colors.muted}>
                {r.done && r.kind === 'medication' && r.doneBy
                  ? t('reminders.givenBy', { name: r.doneBy === displayName ? t('reminders.you') : r.doneBy })
                  : r.detail}
              </AppText>
            </View>
            {r.kind === 'medication' ? (
              <GivenButton given={r.done} medicineName={r.title} onToggle={() => toggle(r.id, !r.done)} />
            ) : (
              <IconTile name={kindIcons[r.kind]} />
            )}
          </View>
        ))
      ) : (
        <EmptyView title={t('home.nothingToday')} />
      )}

      <SectionLabel label={t('reminders.comingUp')} />
      {upcoming.length ? (
        <ListGroup>
          {upcoming.map((r) => (
            <ListRow
              key={r.id}
              leading={<IconTile name={kindIcons[r.kind]} tone={r.kind === 'vaccination' ? 'amber' : 'teal'} />}
              title={`${petName(r.petId)} · ${r.title.toLowerCase()}`}
              subtitle={[
                r.dueAt.slice(0, 10) < today ? t('reminders.overdue') : null,
                formatShortWeekdayDate(r.dueAt),
                r.dueAt.endsWith('T00:00:00') ? null : formatTime(r.dueAt),
                r.detail || null,
              ]
                .filter(Boolean)
                .join(' · ')}
              trailing={
                r.kind === 'vaccination' || r.kind === 'deworming' ? (
                  <Button
                    label={t('reminders.book')}
                    variant="tealOutline"
                    size="small"
                    onPress={() =>
                      router.push(
                        bookingHref(
                          pets.find((p) => p.id === r.petId),
                          clinics,
                          visitsByPet[r.petId] ?? [],
                          `${petName(r.petId)} · ${r.title.toLowerCase()}`,
                        ),
                      )
                    }
                  />
                ) : undefined
              }
            />
          ))}
        </ListGroup>
      ) : (
        <EmptyView title={t('reminders.nothingComing')} />
      )}

      {mockHousehold.members.length > 0 && (
        <AppText variant="caption" color={colors.muted}>
          {t('reminders.familySees')}
        </AppText>
      )}
    </Screen>
  );
};

export default RemindersScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  course: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  courseTitle: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.segmentBackground, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  dose: {
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
  time: { width: 56, fontFamily: fonts.headingBold, fontSize: 16 },
});
