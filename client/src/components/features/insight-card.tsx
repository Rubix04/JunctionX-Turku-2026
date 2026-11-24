import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Card from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import Pill, { type PillTone } from '@/components/ui/pill';
import { colors, spacing } from '@/theme';
import type { Insight, InsightComparison } from '@/types/insights';

const comparisonTones: Record<InsightComparison, PillTone> = { asExpected: 'green', slower: 'amber', worse: 'red' };

const Points = ({ title, items, icon }: { title: string; items: string[]; icon?: 'check' | 'alertTriangle' }) =>
  items.length ? (
    <View style={styles.group}>
      <AppText variant="overline" color={colors.muted}>
        {title}
      </AppText>
      {items.map((item) => (
        <View key={item} style={styles.point}>
          {icon ? (
            <Icon name={icon} size={16} color={icon === 'alertTriangle' ? colors.redText : colors.primary} />
          ) : (
            <View style={styles.bullet} />
          )}
          <AppText variant="bodySmall" style={styles.flex}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  ) : null;

/**
 * The AI analysis of the vet's data and the daily logs. Shows a loading row while the AI reads,
 * then the summary, the reasons by source, what to watch and when to call the clinic.
 */
const InsightCard = ({ insight, loading }: { insight: Insight | null; loading?: boolean }) => {
  const { t } = useTranslation();

  if (!insight) {
    return loading ? (
      <Card style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <AppText variant="bodySmall" color={colors.textSecondary}>
          {t('insights.analysing')}
        </AppText>
      </Card>
    ) : null;
  }

  const fromVet = insight.reasons.filter((r) => r.source === 'vet').map((r) => r.text);
  const fromLogs = insight.reasons.filter((r) => r.source === 'behaviour').map((r) => r.text);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="label" color={colors.primary} style={styles.flex}>
          {`✦ ${t('insights.title')}`}
        </AppText>
        {insight.raisedByAi && <Pill label={t('insights.raised')} tone="red" icon="alertTriangle" />}
      </View>
      {insight.comparison && (
        <View style={styles.pill}>
          <Pill label={t(`insights.comparison.${insight.comparison}`)} tone={comparisonTones[insight.comparison]} />
        </View>
      )}
      <AppText>{insight.summary}</AppText>
      <Points title={`🩺 ${t('insights.fromVet')}`} items={fromVet} />
      <Points title={`🐾 ${t('insights.fromBehaviour')}`} items={fromLogs} />
      <Points title={t('insights.watchForTitle')} items={insight.watchFor} icon="check" />
      <Points title={t('insights.callVetTitle')} items={insight.callVetIf} icon="alertTriangle" />
      <AppText variant="caption" color={colors.muted}>
        {[t('insights.disclaimer'), insight.source === 'sample' ? t('insights.sample') : null].filter(Boolean).join(' ')}
      </AppText>
    </Card>
  );
};

export default InsightCard;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  group: { gap: spacing.xs },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: colors.primary },
  pill: { alignSelf: 'flex-start' },
});
