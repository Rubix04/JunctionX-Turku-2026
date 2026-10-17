import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import TrafficLightBadge from '@/components/features/traffic-light-badge';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Note from '@/components/ui/note';
import Pill from '@/components/ui/pill';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getHealthStatus, getLogQuestions } from '@/services/health';
import { getPet } from '@/services/pets';
import { colors, radius, spacing } from '@/theme';
import type { LogQuestion } from '@/types/health';
import { daysBetween, formatLongDate, todayIso } from '@/utils/format';

const loadWatchList = async (petId: string) => {
  const [pet, status, questions] = await Promise.all([getPet(petId), getHealthStatus(petId), getLogQuestions(petId)]);
  return { pet, status, questions };
};

const answerTone = (question: LogQuestion, answer: number) => {
  if (question.redIf.includes(answer as 0 | 1 | 2)) return 'red' as const;
  if (question.yellowIf.includes(answer as 0 | 1 | 2)) return 'amber' as const;
  return 'green' as const;
};

// Recovery after a diagnosis: how far along, what the latest log said and when to call the vet.
const WatchListScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadWatchList(petId), [petId]);
  useReloadOnFocus(reload);

  if (!data) {
    return <Screen header={<ScreenHeader />}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pet, status, questions } = data;
  const watchList = status.watchList;
  const latest = status.latestLog;
  const day = watchList ? Math.min(daysBetween(watchList.startDate, todayIso()) + 1, watchList.totalDays) : 0;
  const watched = watchList ? questions.filter((q) => watchList.questions.some((w) => w.id === q.id)) : questions;

  return (
    <Screen
      header={<ScreenHeader title={pet.name} />}
      footer={<Button label={t('pet.logToday')} icon="edit" size="large" onPress={() => router.push(`/pet/${pet.id}/log`)} />}
    >
      <Card>
        <TrafficLightBadge level={status.level} />
        <AppText variant="h2">
          {watchList
            ? t('home.recovering', { condition: watchList.condition.toLowerCase() })
            : t('home.allGood', { name: pet.name })}
        </AppText>
        {watchList ? (
          <>
            <View style={styles.progressRow}>
              <AppText variant="caption" color={colors.muted}>
                {t('home.dayOf', { day, total: watchList.totalDays })}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                {t('watchList.byVet', { vet: watchList.vetName })}
              </AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(day / watchList.totalDays) * 100}%` }]} />
            </View>
          </>
        ) : (
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {t('watchList.noneBody', { name: pet.name })}
          </AppText>
        )}
      </Card>

      <SectionLabel
        label={latest ? t('watchList.latestLog', { date: formatLongDate(latest.date) }) : t('watchList.watching')}
      />
      <ListGroup>
        {watched.map((q) => {
          const answer = latest?.answers[q.id];
          return (
            <ListRow
              key={q.id}
              title={q.label}
              trailing={
                answer === undefined ? (
                  <Pill label={t('watchList.notLogged')} tone="neutral" />
                ) : (
                  <Pill label={q.options[answer]} tone={answerTone(q, answer)} />
                )
              }
            />
          );
        })}
      </ListGroup>

      {watchList && status.level !== 'green' && watchList.yellowAdvice.length > 0 && (
        <>
          <SectionLabel label={t('watchList.whatToDo')} />
          <View style={styles.advice}>
            {watchList.yellowAdvice.map((line) => (
              <View key={line} style={styles.point}>
                <View style={styles.bullet} />
                <AppText variant="bodySmall" style={styles.flex}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        </>
      )}

      {watchList && (
        <Note tone="red" icon="alertTriangle">
          {t('watchList.callVet', { when: watchList.redWhen })}
        </Note>
      )}

      <ListGroup>
        <ListRow title={t('screens.carePlan')} href={`/pet/${pet.id}/care-plan`} />
        <ListRow title={t('screens.trends')} href={`/pet/${pet.id}/trends`} />
      </ListGroup>
    </Screen>
  );
};

export default WatchListScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.primaryTint, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  advice: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentTint,
    gap: spacing.sm,
  },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: colors.accentDark },
});
