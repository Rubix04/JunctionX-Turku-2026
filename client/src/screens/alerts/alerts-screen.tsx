import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon, { type IconName } from '@/components/ui/icon';
import Note from '@/components/ui/note';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getSeasonalAlerts, seasonFor } from '@/services/content';
import { getDailyLogs, getLogQuestions } from '@/services/health';
import { getPets } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Season, SeasonalAlert } from '@/types/alerts';
import type { Pet } from '@/types/pet';
import { addDays, formatShortDate, localize, todayIso } from '@/utils/format';

const seasons: Season[] = ['winter', 'spring', 'summer', 'autumn', 'holidays'];
const seasonIcons: Record<Season, IconName> = {
  winter: 'snowflake',
  spring: 'sprout',
  summer: 'sun',
  autumn: 'leaf',
  holidays: 'star',
};

/** Pets whose logs from the last 3 days flagged a symptom this card warns about */
type Matches = Record<string, string[]>;

const loadAlerts = async () => {
  const pets = await getPets();
  const alerts = await getSeasonalAlerts([...new Set(pets.map((p) => p.species))]);
  const since = addDays(todayIso(), -3);
  const flagged = await Promise.all(
    pets.map(async (pet) => {
      const [logs, questions] = await Promise.all([getDailyLogs(pet.id), getLogQuestions(pet.id)]);
      const ids = new Set<string>();
      for (const log of logs.filter((l) => l.date >= since)) {
        for (const q of questions) {
          const answer = log.answers[q.id];
          if (answer !== undefined && (q.yellowIf.includes(answer) || q.redIf.includes(answer))) ids.add(q.id);
        }
      }
      return { pet, ids };
    }),
  );
  const matches: Matches = Object.fromEntries(
    alerts.map((a) => [
      a.id,
      flagged.filter((f) => a.species.includes(f.pet.species) && a.relatedSymptoms.some((s) => f.ids.has(s))).map((f) => f.pet.name),
    ]),
  );
  return { pets, alerts, matches };
};

const AlertCard = ({ alert, pets, matched }: { alert: SeasonalAlert; pets: Pet[]; matched: string[] }) => {
  const { t } = useTranslation();
  const forPets = pets.filter((p) => alert.species.includes(p.species)).map((p) => p.name);
  const parts = [
    { key: 'risk', icon: 'alertTriangle' as const, text: localize(alert.risk) },
    { key: 'prevention', icon: 'shieldCheck' as const, text: localize(alert.prevention) },
    { key: 'watchFor', icon: 'search' as const, text: localize(alert.watchFor) },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <AppText variant="title" style={styles.flex}>
          {localize(alert.title)}
        </AppText>
      </View>
      {forPets.length > 0 && (
        <AppText variant="caption" color={colors.muted}>
          {t('alerts.forPets', { names: forPets.join(', ') })}
        </AppText>
      )}
      {parts.map((part) => (
        <View key={part.key} style={styles.part}>
          <Icon name={part.icon} size={18} color={part.key === 'risk' ? colors.redText : colors.primary} />
          <View style={styles.flex}>
            <AppText variant="overline" color={colors.muted}>
              {t(`alerts.${part.key}`)}
            </AppText>
            <AppText variant="bodySmall">{part.text}</AppText>
          </View>
        </View>
      ))}
      {matched.length > 0 && (
        <Note tone="amber" icon="alertCircle">
          {t('alerts.logMatch', { names: matched.join(', ') })}
        </Note>
      )}
      <View style={styles.actions}>
        {alert.substanceId && (
          <Button
            label={t('alerts.isItSafe')}
            variant="tealOutline"
            size="small"
            onPress={() => router.push(`/substance/${alert.substanceId}`)}
          />
        )}
      </View>
      <AppText variant="caption" color={colors.muted}>
        {t('alerts.updated', { date: formatShortDate(alert.updatedOn) })}
      </AppText>
    </View>
  );
};

// Seasonal alerts filtered by the household's species (spec 9).
const AlertsScreen = () => {
  const { t, i18n } = useTranslation();
  const { data, error, reload } = useAsync(loadAlerts, [i18n.language]);
  const current = seasonFor();
  const [season, setSeason] = useState<Season>(current);

  const header = (
    <View style={styles.header}>
      <AppText variant="h1" accessibilityRole="header" style={styles.flex}>
        {t('alerts.title')}
      </AppText>
    </View>
  );

  if (!data) {
    return (
      <Screen inTabs header={header}>
        {error ? <ErrorView onRetry={reload} /> : <LoadingView />}
      </Screen>
    );
  }

  const shown = data.alerts.filter((a) => a.season === season);
  const ordered = [current, ...seasons.filter((s) => s !== current)];

  return (
    <Screen inTabs header={header} noPadding contentStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {ordered.map((s) => {
          const selected = s === season;
          return (
            <Pressable
              key={s}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setSeason(s)}
              style={[styles.tab, selected ? styles.tabOn : styles.tabOff]}
            >
              <Icon name={seasonIcons[s]} size={16} color={selected ? colors.onDark : colors.primary} />
              <AppText variant="bodySmall" color={selected ? colors.onDark : colors.text} style={styles.tabText}>
                {s === current ? t('alerts.now', { season: t(`seasons.${s}`) }) : t(`seasons.${s}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScreenSection>
        {shown.length ? (
          shown.map((alert) => (
            <AlertCard key={alert.id} alert={alert} pets={data.pets} matched={data.matches[alert.id] ?? []} />
          ))
        ) : (
          <EmptyView title={t('alerts.none')} />
        )}
        <AppText variant="caption" color={colors.muted} style={styles.center}>
          {t('alerts.maintained')}
        </AppText>
      </ScreenSection>
    </Screen>
  );
};

export default AlertsScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { gap: spacing.md },
  tabs: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  tab: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabOff: { backgroundColor: colors.surface, borderColor: colors.border },
  tabText: { fontFamily: fonts.bodySemiBold },
  card: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  part: { flexDirection: 'row', gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
