import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import TrafficLightBadge from '@/components/features/traffic-light-badge';
import AppText from '@/components/ui/app-text';
import Card from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useAsync } from '@/hooks/use-async';
import { getInsights } from '@/services/insights';
import { colors, spacing } from '@/theme';
import type { HealthStatus } from '@/types/health';
import type { Pet } from '@/types/pet';
import { daysBetween, todayIso } from '@/utils/format';

type PetStatusCardProps = {
  pet: Pet;
  status: HealthStatus;
  /** Shown under the summary inside the card, e.g. the "Log today" and "Add vet visit" buttons */
  children?: ReactNode;
};

// The pet's traffic light, recovery day and the AI's one-line reading. Tapping it opens the watch list.
// Used on Home and on the pet page, so both always show the same level.
const PetStatusCard = ({ pet, status, children }: PetStatusCardProps) => {
  const { t } = useTranslation();
  const watchList = status.watchList;
  // The AI analysis comes a moment later; until then the rules' level shows.
  const { data: insight } = useAsync(() => getInsights(pet.id), [pet.id, status]);
  const level = insight?.level ?? status.level;

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('home.viewDetails')}
        onPress={() => router.push(`/pet/${pet.id}/watch-list`)}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={styles.top}>
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
      {children}
    </Card>
  );
};

export default PetStatusCard;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.7 },
});
