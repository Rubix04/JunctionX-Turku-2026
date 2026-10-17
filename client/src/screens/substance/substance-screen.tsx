import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import Disclaimer from '@/components/features/disclaimer';
import RiskBadge from '@/components/features/risk-badge';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ListGroup } from '@/components/ui/list-group';
import Note from '@/components/ui/note';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getSubstance } from '@/services/knowledge';
import { colors, fonts, spacing } from '@/theme';
import { formatShortDate } from '@/utils/format';

// One knowledge base entry: risk by species, why, symptoms, what to do now (spec 10).
const SubstanceScreen = () => {
  const { t, i18n } = useTranslation();
  const { id, species } = useLocalSearchParams<{ id: string; species?: string }>();
  const { data, error, reload } = useAsync(() => getSubstance(id), [id, i18n.language]);

  const header = <ScreenHeader title={data?.name ?? t('screens.substance')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const worst = ['emergency', 'dangerous'].includes(data.risk.cat) || ['emergency', 'dangerous'].includes(data.risk.dog);

  return (
    <Screen
      header={header}
      footer={
        <Button
          label={t('substance.ateThis')}
          size="large"
          variant={worst ? 'danger' : 'outline'}
          icon="alertTriangle"
          onPress={() => router.push(`/ate-this?substanceId=${data.id}`)}
        />
      }
    >
      <View style={styles.heading}>
        <AppText variant="caption" color={colors.muted}>
          {data.categoryLabel}
        </AppText>
        {data.otherNames.length > 0 && (
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {t('substance.alsoCalled', { names: data.otherNames.join(', ') })}
          </AppText>
        )}
      </View>

      <SectionLabel label={t('substance.riskBySpecies')} />
      <ListGroup>
        {(['cat', 'dog', 'smallAnimal'] as const).map((s) => (
          <View key={s} style={[styles.riskRow, species === s && styles.riskRowSelected]}>
            <AppText variant="label" style={styles.flex}>
              {t(`species.${s}`)}
            </AppText>
            <RiskBadge level={data.risk[s]} large />
          </View>
        ))}
      </ListGroup>

      <SectionLabel label={t('substance.why')} />
      <AppText style={styles.paragraph}>{data.summary}</AppText>

      <SectionLabel label={t('substance.symptoms')} />
      <View style={styles.symptoms}>
        {data.symptoms.map((symptom) => (
          <View key={symptom} style={styles.symptom}>
            <AppText variant="bodySmall" style={styles.semibold}>
              {symptom}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.onset}>
        <Icon name="clock" size={18} color={colors.muted} />
        <AppText variant="bodySmall" color={colors.textSecondary}>
          {t('substance.onset', { onset: data.onset })}
        </AppText>
      </View>

      <SectionLabel label={t('substance.whatToDo')} color={colors.redText} />
      <Note tone="red" icon="alertTriangle">
        {data.firstAid}
      </Note>
      <Note icon="info">{t('substance.noVomiting')}</Note>

      <View style={styles.sources}>
        <AppText variant="caption" color={colors.muted}>
          {t('substance.sources', { sources: data.sources.join('; ') })}
        </AppText>
        <AppText variant="caption" color={colors.muted}>
          {t(data.content.status === 'reviewed' ? 'substance.updated' : 'substance.sample', {
            date: formatShortDate(data.content.updatedOn),
          })}
        </AppText>
      </View>
      <Disclaimer kind="knowledge" />
    </Screen>
  );
};

export default SubstanceScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.bodySemiBold },
  heading: { gap: spacing.xs },
  riskRow: { minHeight: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  riskRowSelected: { backgroundColor: colors.primaryTint },
  paragraph: { lineHeight: 23 },
  symptoms: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  symptom: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  onset: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sources: { gap: spacing.xs, marginTop: spacing.sm },
});
