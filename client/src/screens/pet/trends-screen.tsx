import { useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import SegmentedControl from '@/components/ui/segmented-control';
import Screen from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getDietPlan, getTrends, getWeights } from '@/services/diet';
import { getDailyLogs, getLogQuestions } from '@/services/health';
import { getPet } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { TrafficLightLevel } from '@/types/health';
import { addDays, daysBetween, formatDayMonth, formatMonth, formatNumber, todayIso } from '@/utils/format';
import { evaluateLog } from '@/utils/evaluate-log';

type Range = 'week' | 'months';

const loadTrends = async (petId: string) => {
  const [pet, trends, weights, logs, questions, diet] = await Promise.all([
    getPet(petId),
    getTrends(petId),
    getWeights(petId),
    getDailyLogs(petId),
    getLogQuestions(petId),
    getDietPlan(petId),
  ]);
  return { pet, trends, weights, logs, questions, diet };
};

const statusColors: Record<TrafficLightLevel | 'none', string> = {
  green: colors.green,
  yellow: colors.yellow,
  red: colors.red,
  none: colors.divider,
};

const CHART_HEIGHT = 120;

const Card = ({ title, note, children }: { title: string; note?: string; children: ReactNode }) => (
  <View style={styles.card}>
    <View style={styles.cardTitle}>
      <AppText variant="label" style={styles.cardTitleText}>
        {title}
      </AppText>
      {note ? (
        <AppText variant="caption" color={colors.muted}>
          {note}
        </AppText>
      ) : null}
    </View>
    {children}
  </View>
);

// Water intake, weight and daily status as charts (spec 1).
const TrendsScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadTrends(petId), [petId]);
  const [range, setRange] = useState<Range>('week');

  const header = <ScreenHeader title={data ? t('trends.title', { name: data.pet.name }) : t('screens.trends')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { trends, weights, logs, questions, diet } = data;
  const today = todayIso();

  // Water: one bar per week or month, amber above the vet's watch level.
  const water = trends ? (range === 'week' ? trends.waterByWeek : trends.waterByMonth) : [];
  const waterMax = Math.max(300, ...water.map((w) => w.ml));
  const watch = trends?.waterWatchMl ?? null;
  const waterLabel = (label: string) =>
    label === 'now'
      ? t('trends.now')
      : /^\d{4}-\d{2}$/.test(label)
        ? formatMonth(`${label}-01`)
        : label;

  // Weight: the last 4 weeks or 3 months.
  const since = addDays(today, range === 'week' ? -35 : -95);
  const shownWeights = weights.filter((w) => w.date >= since);
  const kgs = shownWeights.map((w) => w.weightKg);
  const [ideal0, ideal1] = diet?.idealWeightKg ?? [Math.min(...kgs), Math.max(...kgs)];
  const low = Math.min(...kgs, ideal0) - 0.2;
  const high = Math.max(...kgs, ideal1) + 0.2;
  const y = (kg: number) => CHART_HEIGHT - ((kg - low) / (high - low)) * CHART_HEIGHT;
  const x = (i: number) => (shownWeights.length > 1 ? (i / (shownWeights.length - 1)) * 300 : 150);
  const points = shownWeights.map((w, i) => `${x(i)},${y(w.weightKg)}`).join(' ');
  const change = shownWeights.length > 1 ? kgs[kgs.length - 1] - kgs[0] : 0;
  const weeks = shownWeights.length > 1 ? Math.round(daysBetween(shownWeights[0].date, shownWeights[shownWeights.length - 1].date) / 7) : 0;

  // Daily status for the last 14 days.
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const status = days.map((day) => {
    const log = logs.find((l) => l.date === day);
    return log ? evaluateLog(log, questions) : 'none';
  });

  return (
    <Screen header={header}>
      <SegmentedControl
        label={t('trends.range')}
        value={range}
        onChange={setRange}
        options={[
          { value: 'week', label: t('trends.byWeek') },
          { value: 'months', label: t('trends.months') },
        ]}
      />

      {water.length > 0 && (
        <Card title={t('trends.water')} note={t('trends.waterUnit')}>
          <View style={styles.bars} accessibilityLabel={t('trends.waterA11y', { values: water.map((w) => `${waterLabel(w.label)} ${w.ml}`).join(', ') })}>
            {watch && (
              <>
                <View style={[styles.watchLine, { bottom: (watch / waterMax) * CHART_HEIGHT }]} />
                <AppText
                  variant="caption"
                  color={colors.yellowText}
                  style={[styles.watchLabel, { bottom: (watch / waterMax) * CHART_HEIGHT + 4 }]}
                >
                  {t('trends.watchLevel')}
                </AppText>
              </>
            )}
            {water.map((w) => (
              <View key={w.label} style={styles.barColumn}>
                <AppText variant="caption" color={colors.textSecondary} style={styles.barValue}>
                  {w.ml}
                </AppText>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (w.ml / waterMax) * CHART_HEIGHT,
                      backgroundColor: watch && w.ml > watch ? colors.yellow : colors.primary,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.barLabels}>
            {water.map((w) => (
              <AppText key={w.label} variant="caption" color={colors.muted} style={styles.barLabel}>
                {waterLabel(w.label)}
              </AppText>
            ))}
          </View>
        </Card>
      )}

      {shownWeights.length > 0 && (
        <Card
          title={t('trends.weight')}
          note={diet?.idealWeightKg ? t('trends.ideal', { from: formatNumber(ideal0), to: formatNumber(ideal1) }) : 'kg'}
        >
          <Svg width="100%" height={CHART_HEIGHT + 16} viewBox={`-8 -8 316 ${CHART_HEIGHT + 16}`} accessible={false}>
            {diet?.idealWeightKg && (
              <Rect x={-8} y={y(ideal1)} width={316} height={y(ideal0) - y(ideal1)} fill={colors.greenTint} />
            )}
            <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" />
            {shownWeights.map((w, i) => (
              <Circle key={w.date} cx={x(i)} cy={y(w.weightKg)} r={4.5} fill={colors.surface} stroke={colors.primary} strokeWidth={2.5} />
            ))}
          </Svg>
          <View style={styles.weightLabels}>
            <AppText variant="caption" color={colors.muted}>
              {`${formatDayMonth(shownWeights[0].date)} · ${formatNumber(kgs[0], 2)} kg`}
            </AppText>
            <AppText variant="caption" color={colors.text} style={styles.bold}>
              {`${formatNumber(kgs[kgs.length - 1], 2)} kg`}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.muted}>
            {Math.abs(change) < 0.05
              ? t('trends.weightSteady')
              : t(change < 0 ? 'trends.weightDown' : 'trends.weightUp', {
                  kg: formatNumber(Math.abs(change), 2),
                  weeks,
                })}
          </AppText>
        </Card>
      )}

      <Card title={t('trends.dailyStatus')}>
        <View style={styles.days}>
          {status.map((level, i) => (
            <View
              key={days[i]}
              style={[styles.day, { backgroundColor: statusColors[level] }]}
              accessible
              accessibilityLabel={`${formatDayMonth(days[i])}: ${level === 'none' ? t('trends.noLog') : t(`trafficLight.${level}`)}`}
            />
          ))}
        </View>
        <View style={styles.dayLabels}>
          <AppText variant="caption" color={colors.muted}>
            {formatDayMonth(days[0])}
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            {t('trends.today')}
          </AppText>
        </View>
        <View style={styles.legend}>
          {(['green', 'yellow', 'red', 'none'] as const).map((level) => (
            <View key={level} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: statusColors[level] }, level === 'none' && styles.legendNone]}
              />
              <AppText variant="caption" color={colors.textSecondary}>
                {level === 'none' ? t('trends.noLog') : t(`trends.legend.${level}`)}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      <AppText variant="caption" color={colors.muted} style={styles.center}>
        {t('trends.sampleData')}
      </AppText>
    </Screen>
  );
};

export default TrendsScreen;

const styles = StyleSheet.create({
  bold: { fontFamily: fonts.bodyBold },
  center: { textAlign: 'center' },
  card: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  cardTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  cardTitleText: { fontSize: 16 },
  bars: {
    height: CHART_HEIGHT + 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  watchLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.yellowBorder,
  },
  watchLabel: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    zIndex: 1,
  },
  barColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barValue: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
  bar: { width: '100%', maxWidth: 40, borderTopLeftRadius: radius.sm / 1.5, borderTopRightRadius: radius.sm / 1.5 },
  barLabels: { flexDirection: 'row', gap: 10 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 12 },
  weightLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  days: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, height: 26, borderRadius: 6 },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendNone: { borderWidth: 1, borderColor: colors.borderStrong },
});
