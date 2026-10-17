import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import PetAvatar, { speciesTint } from '@/components/features/pet-avatar';
import TrafficLightBadge from '@/components/features/traffic-light-badge';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Icon, { type IconName } from '@/components/ui/icon';
import IconTile from '@/components/ui/icon-tile';
import { DateTile, ListGroup, ListRow } from '@/components/ui/list-group';
import Pill from '@/components/ui/pill';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import SegmentedControl from '@/components/ui/segmented-control';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getCarePlan, getReminders, getVisits } from '@/services/care';
import { getDietPlan } from '@/services/diet';
import { getHealthStatus } from '@/services/health';
import { getPassport, vaccinationStatus } from '@/services/passport';
import { getPet } from '@/services/pets';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';
import type { CarePlan, Visit } from '@/types/care';
import type { HealthStatus } from '@/types/health';
import type { Passport } from '@/types/passport';
import type { Pet } from '@/types/pet';
import {
  ageInYears,
  daysBetween,
  formatDayMonth,
  formatLongDate,
  formatMonthShort,
  formatNumber,
  formatTime,
  parseDate,
  todayIso,
} from '@/utils/format';

const loadPetPage = async (petId: string) => {
  const pet = await getPet(petId);
  const [status, carePlan, reminders, diet, passport, visits] = await Promise.all([
    getHealthStatus(petId),
    getCarePlan(petId),
    getReminders(petId),
    getDietPlan(petId),
    getPassport(petId),
    getVisits(petId),
  ]);
  return { pet, status, carePlan, reminders, diet, passport, visits };
};

const petTabs = ['overview', 'records', 'passport'] as const;
type PetTab = (typeof petTabs)[number];

const recordKinds = ['allergies', 'conditions', 'surgeries', 'medications', 'labs', 'visits'] as const;
type RecordKind = (typeof recordKinds)[number];

const recordIcons: Record<RecordKind, IconName> = {
  allergies: 'alertTriangle',
  conditions: 'heartPulse',
  surgeries: 'clipboard',
  medications: 'pill',
  labs: 'flask',
  visits: 'calendar',
};

type MedicalRecord = { id: string; kind: RecordKind; date: string; title: string; detail: string; visitId?: string };

/** "246098100234517" -> "246 098 100 234 517" */
const formatChip = (chip: string) => chip.replace(/(\d{3})(?=\d)/g, '$1 ');

/** Allergies, diagnoses, surgeries, medicines, lab results and visits on one timeline, newest first */
const medicalRecords = (passport: Passport | null, visits: Visit[], t: TFunction) => {
  const records: MedicalRecord[] = visits.map((v) => ({
    id: v.id,
    kind: 'visits',
    date: v.date,
    title: v.title,
    detail: [v.clinicName, v.vetName].filter(Boolean).join(' · '),
    visitId: v.id,
  }));
  if (passport) {
    for (const a of passport.allergies) {
      records.push({
        id: a.id,
        kind: 'allergies',
        date: passport.allergiesUpdatedOn ?? '',
        title: a.allergen,
        detail: t(`pet.records.severity.${a.severity}`),
      });
    }
    for (const c of passport.conditions) {
      records.push({
        id: c.id,
        kind: 'conditions',
        date: c.diagnosedOn,
        title: c.name,
        detail: t(c.resolved ? 'pet.records.resolved' : 'pet.records.ongoing'),
      });
    }
    for (const s of passport.surgeries) {
      records.push({ id: s.id, kind: 'surgeries', date: `${s.year}-01-01`, title: s.name, detail: String(s.year) });
    }
    for (const m of passport.medications) {
      records.push({
        id: m.id,
        kind: 'medications',
        date: m.startDate,
        title: m.name,
        detail: [m.dosage, m.reason].filter(Boolean).join(' · '),
      });
    }
    for (const l of passport.labReports) {
      records.push({
        id: l.id,
        kind: 'labs',
        date: l.date,
        title: `${t(`pet.records.lab.${l.kind}`)} · ${l.title}`,
        detail: l.summary,
      });
    }
  }
  return records.sort((a, b) => b.date.localeCompare(a.date));
};

const OverviewTab = ({
  pet,
  status,
  carePlan,
  visits,
  nextDose,
  dietName,
}: {
  pet: Pet;
  status: HealthStatus;
  carePlan: CarePlan | null;
  visits: Visit[];
  nextDose: string | null;
  dietName: string | null;
}) => {
  const { t } = useTranslation();
  const watchList = status.watchList;
  const today = todayIso();

  return (
    <>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/pet/${pet.id}/watch-list`)}
        style={({ pressed }) => [styles.statusCard, pressed && styles.pressed]}
      >
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
        <View style={styles.row}>
          <AppText variant="label" style={styles.flex}>
            {watchList
              ? t('home.recovering', { condition: watchList.condition.toLowerCase() })
              : t('home.allGood', { name: pet.name })}
          </AppText>
          <Icon name="chevronRight" size={20} color={colors.muted} />
        </View>
      </Pressable>

      <Button label={t('pet.logToday')} icon="edit" onPress={() => router.push(`/pet/${pet.id}/log`)} />

      <ListGroup>
        <ListRow
          leading={<IconTile name="clipboard" />}
          title={t('screens.carePlan')}
          subtitle={
            carePlan
              ? t('pet.fromVisit', { date: formatDayMonth(visits.find((v) => v.id === carePlan.visitId)?.date ?? today) })
              : t('pet.noCarePlan')
          }
          href={`/pet/${pet.id}/care-plan`}
        />
        <ListRow
          leading={<IconTile name="pill" />}
          title={t('pet.medication')}
          subtitle={nextDose ? t('pet.nextDose', { time: nextDose }) : t('pet.noMedication')}
          href={`/pet/${pet.id}/reminders`}
        />
        <ListRow
          leading={<IconTile name="bowl" />}
          title={t('screens.diet')}
          subtitle={dietName ?? t('pet.portionCalculator')}
          href={`/pet/${pet.id}/diet`}
        />
        <ListRow
          leading={<IconTile name="chart" />}
          title={t('screens.trends')}
          subtitle={t('pet.trendsHint')}
          href={`/pet/${pet.id}/trends`}
        />
      </ListGroup>
    </>
  );
};

const RecordsTab = ({ pet, records, carePlan }: { pet: Pet; records: MedicalRecord[]; carePlan: CarePlan | null }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<RecordKind | null>(null);
  const shown = filter ? records.filter((r) => r.kind === filter) : records;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[null, ...recordKinds].map((kind) => {
          const selected = filter === kind;
          return (
            <Pressable
              key={kind ?? 'all'}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setFilter(kind)}
              style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
            >
              <AppText variant="bodySmall" color={selected ? colors.onDark : colors.text} style={styles.chipText}>
                {t(`pet.records.kind.${kind ?? 'all'}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {shown.length ? (
        <ListGroup>
          {shown.map((record) => (
            <ListRow
              key={`${record.kind}-${record.id}`}
              leading={
                record.kind === 'visits' ? (
                  <DateTile day={String(parseDate(record.date).getDate())} month={formatMonthShort(record.date)} />
                ) : (
                  <IconTile name={recordIcons[record.kind]} tone={record.kind === 'allergies' ? 'red' : 'teal'} />
                )
              }
              title={record.title}
              subtitle={[
                record.kind === 'visits' || record.kind === 'surgeries' || !record.date
                  ? null
                  : formatLongDate(record.date),
                record.detail,
              ]
                .filter(Boolean)
                .join(' · ')}
              href={record.visitId && carePlan?.visitId === record.visitId ? `/pet/${pet.id}/care-plan` : undefined}
            />
          ))}
        </ListGroup>
      ) : (
        <EmptyView title={t('pet.records.empty')} />
      )}

      <Button
        label={t('pet.addVisit')}
        icon="plus"
        variant="outline"
        onPress={() => router.push(`/add-visit?petId=${pet.id}`)}
      />
    </>
  );
};

const PassportTab = ({ pet, passport }: { pet: Pet; passport: Passport | null }) => {
  const { t } = useTranslation();

  if (!passport) {
    return <EmptyView title={t('passport.empty')} />;
  }

  const facts = [
    { label: t('passport.microchip'), value: passport.microchip ? formatChip(passport.microchip) : '–' },
    { label: t('pet.passportTab.markings'), value: passport.markings ?? '–' },
    { label: t('pet.passportTab.registration'), value: passport.registration ?? '–' },
    { label: t('passport.born'), value: pet.birthDate ? formatLongDate(pet.birthDate) : '–' },
    { label: t('pet.passportTab.sex'), value: t(`pet.sex.${passport.sex}${passport.neutered ? 'Neutered' : ''}`) },
    { label: t('passport.owner'), value: passport.ownerName },
  ];

  // Short summary for travel, boarding or a new owner, sent with the phone's share sheet.
  const exportSummary = () => {
    const lines = [
      t('pet.passportTab.summaryTitle', { name: pet.name }),
      [t(`species.${pet.species}`), pet.breed].filter(Boolean).join(', '),
      ...facts.map((f) => `${f.label}: ${f.value}`),
      `${t('passport.vaccinations')}: ${
        passport.vaccinations
          .map((v) => `${v.name} (${t('pet.passportTab.validUntil', { date: formatLongDate(v.validUntil) })})`)
          .join('; ') || '–'
      }`,
      `${t('passport.allergies')}: ${passport.allergies.map((a) => a.allergen).join(', ') || t('passport.noneKnown')}`,
      `${t('passport.medication')}: ${
        passport.medications.map((m) => [m.name, m.dosage].filter(Boolean).join(' ')).join(', ') || '–'
      }`,
    ];
    Share.share({ message: lines.join('\n') });
  };

  return (
    <>
      <Card>
        <View style={styles.row}>
          <IconTile name="passport" />
          <AppText variant="title" style={styles.flex}>
            {t('pet.passportTab.title')}
          </AppText>
        </View>
        {facts.map((fact) => (
          <View key={fact.label} style={styles.fact}>
            <AppText variant="caption" color={colors.muted}>
              {fact.label}
            </AppText>
            <AppText variant="body" style={fact.label === t('passport.microchip') && styles.mono}>
              {fact.value}
            </AppText>
          </View>
        ))}
      </Card>

      <SectionLabel label={t('passport.vaccinations')} />
      {passport.vaccinations.length ? (
        <ListGroup>
          {passport.vaccinations.map((v) => {
            const state = vaccinationStatus(v.validUntil);
            return (
              <ListRow
                key={v.id}
                title={v.name}
                subtitle={t('pet.passportTab.validUntil', { date: formatLongDate(v.validUntil) })}
                trailing={
                  <Pill
                    label={t(`passport.vaccine.${state}`)}
                    tone={state === 'valid' ? 'green' : state === 'dueSoon' ? 'amber' : 'red'}
                  />
                }
              />
            );
          })}
        </ListGroup>
      ) : (
        <EmptyView title={t('passport.none')} />
      )}

      <Button label={t('pet.passportTab.shareVet')} icon="qr" onPress={() => router.push(`/pet/${pet.id}/share-passport`)} />
      <AppText variant="caption" color={colors.muted} style={styles.center}>
        {t('pet.passportTab.shareVetHint')}
      </AppText>
      <Button label={t('pet.passportTab.export')} icon="share" variant="outline" onPress={exportSummary} />
      <ListGroup>
        <ListRow leading={<IconTile name="file" />} title={t('pet.passportTab.full')} href={`/pet/${pet.id}/passport`} />
      </ListGroup>
    </>
  );
};

// One page per pet: overview, structured medical records and the digital passport.
const PetScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadPetPage(petId), [petId]);
  const [tab, setTab] = useState<PetTab>('overview');
  useReloadOnFocus(reload);

  const backButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={styles.roundButton}
    >
      <Icon name="back" size={22} />
    </Pressable>
  );

  if (!data) {
    return (
      <Screen header={<View style={styles.loadingHeader}>{backButton}</View>}>
        {error ? <ErrorView onRetry={reload} /> : <LoadingView />}
      </Screen>
    );
  }

  const { pet, status, carePlan, reminders, diet, passport, visits } = data;
  const nextDose = reminders.find((r) => r.kind === 'medication' && !r.done && r.dueAt >= todayIso());
  const facts = [
    pet.birthDate ? t('pet.years', { count: ageInYears(pet.birthDate) }) : null,
    pet.weightKg ? `${formatNumber(pet.weightKg)} kg` : null,
    passport ? t(`pet.sex.${passport.sex}${passport.neutered ? 'Neutered' : ''}`) : null,
  ].filter(Boolean);

  return (
    <Screen noPadding contentStyle={styles.content} background={colors.background}>
      <View style={[styles.hero, { backgroundColor: speciesTint[pet.species] }]}>
        {backButton}
        <View style={styles.identity}>
          <View>
            <PetAvatar species={pet.species} photoUrl={pet.photoUrl} size={96} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('pet.changePhoto')}
              onPress={() => router.push(`/pet/${pet.id}/photo`)}
              style={[styles.photoButton, { borderColor: speciesTint[pet.species] }]}
            >
              <Icon name="camera" size={18} color={colors.onDark} />
            </Pressable>
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
        <SegmentedControl
          label={pet.name}
          options={petTabs.map((value) => ({ value, label: t(`pet.tabs.${value}`) }))}
          value={tab}
          onChange={setTab}
        />
        {tab === 'overview' && (
          <OverviewTab
            pet={pet}
            status={status}
            carePlan={carePlan}
            visits={visits}
            nextDose={nextDose ? formatTime(nextDose.dueAt) : null}
            dietName={diet?.name.split(',')[0] ?? null}
          />
        )}
        {tab === 'records' && <RecordsTab pet={pet} records={medicalRecords(passport, visits, t)} carePlan={carePlan} />}
        {tab === 'passport' && <PassportTab pet={pet} passport={passport} />}
      </ScreenSection>
    </Screen>
  );
};

export default PetScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  content: { gap: spacing.lg },
  loadingHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 22, gap: 10 },
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
  statusCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.7 },
  chips: { gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.border },
  chipText: { fontFamily: fonts.bodySemiBold },
  fact: { gap: 2 },
  mono: { fontFamily: fonts.bodySemiBold, letterSpacing: 1 },
});
