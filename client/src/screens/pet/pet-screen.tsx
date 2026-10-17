import { type Href, Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import PetAvatar, { speciesTint } from '@/components/features/pet-avatar';
import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { DateTile, ListGroup, ListRow } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getCarePlan, getReminders, getVisits } from '@/services/care';
import { getSpeciesTopics } from '@/services/content';
import { getDietPlan } from '@/services/diet';
import { getHealthStatus } from '@/services/health';
import { mockHousehold } from '@/services/mock/data';
import { getPassport, vaccinationStatus } from '@/services/passport';
import { getPet } from '@/services/pets';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';
import type { TrafficLightLevel } from '@/types/health';
import {
  ageInYears,
  daysBetween,
  formatDayMonth,
  formatMonthShort,
  formatNumber,
  formatTime,
  localize,
  parseDate,
  todayIso,
} from '@/utils/format';

const loadPetPage = async (petId: string) => {
  const pet = await getPet(petId);
  const [status, carePlan, reminders, diet, passport, visits, topics] = await Promise.all([
    getHealthStatus(petId),
    getCarePlan(petId),
    getReminders(petId),
    getDietPlan(petId),
    getPassport(petId),
    getVisits(petId),
    getSpeciesTopics(pet.species),
  ]);
  return { pet, status, carePlan, reminders, diet, passport, visits, topics };
};

const dot: Record<TrafficLightLevel, { fill: string; border: string }> = {
  green: { fill: colors.green, border: colors.greenText },
  yellow: { fill: colors.yellow, border: colors.yellowBorder },
  red: { fill: colors.red, border: colors.redText },
};

type TileProps = { icon: IconName; title: string; subtitle: string; href: Href };

const Tile = ({ icon, title, subtitle, href }: TileProps) => (
  <Link href={href} asChild>
    <Pressable accessibilityRole="link" style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Icon name={icon} size={24} color={colors.primary} />
      <AppText variant="label">{title}</AppText>
      <AppText variant="caption" color={colors.muted}>
        {subtitle}
      </AppText>
    </Pressable>
  </Link>
);

// One page per pet (spec 11): status, shortcuts, visits and dog or cat content.
const PetScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadPetPage(petId), [petId]);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  useReloadOnFocus(reload);

  if (!data) {
    return <Screen>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pet, status, carePlan, reminders, diet, passport, visits, topics } = data;
  const today = todayIso();
  const watchList = status.watchList;
  const nextDose = reminders.find((r) => r.kind === 'medication' && !r.done && r.dueAt >= today);
  const vaccinesOk = passport?.vaccinations.every((v) => vaccinationStatus(v.validUntil) === 'valid') ?? true;
  const facts = [
    pet.birthDate ? t('pet.years', { count: ageInYears(pet.birthDate) }) : null,
    pet.weightKg ? `${formatNumber(pet.weightKg)} kg` : null,
    passport ? t(`pet.sex.${passport.sex}${passport.neutered ? 'Neutered' : ''}`) : null,
  ].filter(Boolean);

  return (
    <Screen noPadding contentStyle={styles.content} background={colors.background}>
      <View style={[styles.hero, { backgroundColor: speciesTint[pet.species] }]}>
        <View style={styles.heroTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.roundButton}
          >
            <Icon name="back" size={22} />
          </Pressable>
        </View>
        <View style={styles.identity}>
          <View>
            <PetAvatar species={pet.species} photoUrl={pet.photoUrl} size={96} />
            <Link href={`/pet/${pet.id}/photo`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('pet.changePhoto')}
                style={[styles.photoButton, { borderColor: speciesTint[pet.species] }]}
              >
                <Icon name="camera" size={18} color={colors.onDark} />
              </Pressable>
            </Link>
          </View>
          <View style={styles.identityTexts}>
            <AppText variant="h1" accessibilityRole="header" style={styles.name}>
              {pet.name}
            </AppText>
            <AppText variant="bodySmall" color={colors.textSecondary}>
              {[t(`species.${pet.species}`), pet.breed].filter(Boolean).join(' · ')}
            </AppText>
            {facts.length > 0 && (
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {facts.join(' · ')}
              </AppText>
            )}
          </View>
        </View>
      </View>

      <ScreenSection>
        <Link href={`/pet/${pet.id}/log-result?level=${status.level}`} asChild>
          <Pressable accessibilityRole="link" style={styles.statusRow}>
            <View
              style={[styles.dot, { backgroundColor: dot[status.level].fill, borderColor: dot[status.level].border }]}
            />
            <View style={styles.flex}>
              <AppText variant="label">{t(`trafficLight.${status.level}`)}</AppText>
              <AppText variant="caption" color={colors.muted}>
                {watchList
                  ? t('pet.watchListDay', {
                      condition: watchList.condition,
                      day: Math.min(daysBetween(watchList.startDate, today) + 1, watchList.totalDays),
                      total: watchList.totalDays,
                    })
                  : t('pet.noWatchList')}
              </AppText>
            </View>
            <Icon name="chevronRight" size={18} color={colors.muted} />
          </Pressable>
        </Link>

        <View style={styles.grid}>
          <Tile
            icon="list"
            title={t('pet.symptomLog')}
            subtitle={watchList ? t('pet.watchListItems', { count: watchList.questions.length }) : t('pet.dailyLog')}
            href={`/pet/${pet.id}/log`}
          />
          <Tile
            icon="clipboard"
            title={t('screens.carePlan')}
            subtitle={
              carePlan
                ? t('pet.fromVisit', {
                    date: formatDayMonth(visits.find((v) => v.id === carePlan.visitId)?.date ?? today),
                  })
                : t('pet.noCarePlan')
            }
            href={`/pet/${pet.id}/care-plan`}
          />
          <Tile
            icon="pill"
            title={t('pet.medication')}
            subtitle={nextDose ? t('pet.nextDose', { time: formatTime(nextDose.dueAt) }) : t('pet.noMedication')}
            href={`/pet/${pet.id}/reminders`}
          />
          <Tile
            icon="bowl"
            title={t('screens.diet')}
            subtitle={diet?.name.split(',')[0] ?? t('pet.portionCalculator')}
            href={`/pet/${pet.id}/diet`}
          />
          <Tile
            icon="passport"
            title={t('screens.passport')}
            subtitle={vaccinesOk ? t('pet.vaccinesOk') : t('pet.vaccinesDue')}
            href={`/pet/${pet.id}/passport`}
          />
          <Tile icon="chart" title={t('screens.trends')} subtitle={t('pet.trendsHint')} href={`/pet/${pet.id}/trends`} />
        </View>

        <SectionLabel
          label={t('pet.visitHistory')}
          action={{ label: t('pet.addVisit'), href: `/add-visit?petId=${pet.id}` }}
        />
        {visits.length ? (
          <ListGroup>
            {visits.map((visit) => (
              <ListRow
                key={visit.id}
                leading={<DateTile day={String(parseDate(visit.date).getDate())} month={formatMonthShort(visit.date)} />}
                title={visit.title}
                subtitle={
                  visit.draft
                    ? t('pet.draftVisit')
                    : [visit.clinicName, visit.vetName].filter(Boolean).join(' · ')
                }
                href={carePlan?.visitId === visit.id ? `/pet/${pet.id}/care-plan` : `/pet/${pet.id}/passport`}
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyView title={t('pet.noVisits')} body={t('pet.noVisitsBody')} />
        )}

        {topics.length > 0 && (
          <>
            <SectionLabel label={t(`pet.speciesSection.${pet.species}`)} />
            <View style={styles.topics}>
              {topics.map((topic) => {
                const open = openTopic === topic.id;
                return (
                  <Pressable
                    key={topic.id}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenTopic(open ? null : topic.id)}
                    style={[styles.topic, topic.danger && styles.topicDanger, open && styles.topicOpen]}
                  >
                    <View style={styles.topicTitle}>
                      {topic.danger && <Icon name="alertTriangle" size={16} color={colors.redText} />}
                      <AppText
                        variant="bodySmall"
                        color={topic.danger ? colors.redText : colors.text}
                        style={styles.topicText}
                      >
                        {localize(topic.title)}
                      </AppText>
                    </View>
                    {open && (
                      <View style={styles.topicBody}>
                        <AppText variant="bodySmall" color={colors.textSecondary}>
                          {localize(topic.tip)}
                        </AppText>
                        {topic.substanceId && (
                          <Link href={`/substance/${topic.substanceId}`} style={styles.topicLink}>
                            <AppText variant="bodySmall" color={colors.primary} style={styles.bold}>
                              {t('pet.readMore')}
                            </AppText>
                          </Link>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {mockHousehold.members.length > 0 && (
          <View style={styles.family}>
            <Icon name="users" size={18} color={colors.muted} />
            <AppText variant="caption" color={colors.muted}>
              {t('pet.sharedWith', { names: mockHousehold.members.map((m) => m.name).join(', ') })}
            </AppText>
          </View>
        )}
      </ScreenSection>
    </Screen>
  );
};

export default PetScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 22, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.sm },
  photoButton: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTexts: { flex: 1, gap: spacing.xs },
  name: { fontSize: 30 },
  statusRow: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  pressed: { backgroundColor: colors.primaryTint },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  topic: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  topicDanger: { backgroundColor: colors.redTint, borderColor: colors.redBorder },
  topicOpen: { flexBasis: '100%', borderRadius: radius.lg },
  topicTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topicText: { fontFamily: fonts.bodySemiBold },
  topicBody: { marginTop: spacing.sm, gap: spacing.sm },
  topicLink: { minHeight: touchTarget, paddingVertical: spacing.sm },
  bold: { fontFamily: fonts.bodyBold },
  family: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
});
