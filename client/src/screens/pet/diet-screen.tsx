import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Note from '@/components/ui/note';
import OptionGroup from '@/components/ui/option-group';
import Pill from '@/components/ui/pill';
import Screen from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import TextField from '@/components/ui/text-field';
import { useAsync } from '@/hooks/use-async';
import { getDietPlan, getWeights, logWeight } from '@/services/diet';
import { getPet, updatePet } from '@/services/pets';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';
import { formatNumber, parseDecimal } from '@/utils/format';
import { estimateDailyKcal, gramsPerDay } from '@/utils/portion';

const loadDiet = async (petId: string) => {
  const [pet, diet, weights] = await Promise.all([getPet(petId), getDietPlan(petId), getWeights(petId)]);
  return { pet, diet, weights };
};

const Card = ({ children }: { children: ReactNode }) => <View style={styles.card}>{children}</View>;

const Stepper = ({ label, onLess, onMore, value }: { label: string; value: string; onLess: () => void; onMore: () => void }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('diet.less', { label })} onPress={onLess} style={styles.stepButton}>
        <AppText style={styles.stepSign}>−</AppText>
      </Pressable>
      <AppText variant="label" style={styles.stepValue} accessibilityLiveRegion="polite">
        {value}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={t('diet.more', { label })} onPress={onMore} style={styles.stepButton}>
        <AppText style={styles.stepSign}>+</AppText>
      </Pressable>
    </View>
  );
};

// Diet recommendation, weight tracking and the portion calculator (spec 3).
const DietScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadDiet(petId), [petId]);
  // Start from the diet plan's values until the user changes them.
  const [per100Choice, setPer100] = useState<number | null>(null);
  const [mealsChoice, setMeals] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState<string | null>(null);
  const per100 = per100Choice ?? data?.diet?.foodKcalPer100g ?? 85;
  const meals = mealsChoice ?? data?.diet?.mealsPerDay ?? 2;

  const header = <ScreenHeader title={t('screens.diet')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pet, diet, weights } = data;
  const latest = weights[weights.length - 1]?.weightKg ?? pet.weightKg;
  const dailyKcal = diet?.dailyKcal ?? (latest ? estimateDailyKcal(pet.species, latest) : null);
  const total = dailyKcal ? gramsPerDay(dailyKcal, per100) : null;
  const parsedWeight = weightInput === null ? null : parseDecimal(weightInput);

  const saveWeight = async () => {
    if (!parsedWeight || parsedWeight <= 0 || parsedWeight > 150) return;
    await logWeight(petId, parsedWeight);
    await updatePet(petId, { weightKg: parsedWeight });
    setWeightInput(null);
    reload();
  };

  return (
    <Screen header={header}>
      {diet && (
        <Card>
          {diet.recommendedBy && <Pill label={t('diet.recommendedBy', { vet: diet.recommendedBy })} />}
          <AppText variant="title">{diet.name}</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {diet.reason}
          </AppText>
          {diet.productId && (
            <Button
              label={t('carePlan.findInStore')}
              icon="store"
              variant="tealOutline"
              size="small"
              onPress={() => router.push(`/find-in-store?productId=${diet.productId}`)}
              style={styles.selfStart}
            />
          )}
        </Card>
      )}

      <Note tone="amber" icon="alertTriangle">
        <AppText variant="bodySmall" color={colors.accentBody} style={styles.bold}>
          {t('diet.changeSlowlyTitle')}
        </AppText>{' '}
        {t('diet.changeSlowlyBody')}
      </Note>

      <Card>
        <View style={styles.rowBetween}>
          <AppText variant="label" style={styles.cardTitle}>
            {t('trends.weight')}
          </AppText>
          <AppText
            variant="bodySmall"
            color={colors.primary}
            style={[styles.bold, styles.link]}
            accessibilityRole="link"
            onPress={() => router.push(`/pet/${petId}/trends`)}
          >
            {t('diet.seeTrend')}
          </AppText>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <AppText variant="caption" color={colors.muted}>
              {t('diet.now')}
            </AppText>
            <AppText variant="h2">{latest ? `${formatNumber(latest, 2)} kg` : '–'}</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="caption" color={colors.muted}>
              {diet?.targetWeightKg ? t('diet.vetTarget') : t('diet.idealRange')}
            </AppText>
            <AppText variant="h2">
              {diet?.targetWeightKg
                ? `${formatNumber(diet.targetWeightKg)} kg`
                : diet?.idealWeightKg
                  ? `${formatNumber(diet.idealWeightKg[0])}–${formatNumber(diet.idealWeightKg[1])}`
                  : '–'}
            </AppText>
          </View>
        </View>
        {weightInput === null ? (
          <Button label={t('diet.logWeight')} variant="tealOutline" onPress={() => setWeightInput('')} />
        ) : (
          <View style={styles.weightForm}>
            <TextField
              label={t('diet.weightKg')}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder="0.0"
              autoFocus
              error={weightInput && !parsedWeight ? t('diet.weightInvalid') : null}
            />
            <View style={styles.rowGap}>
              <Button label={t('common.cancel')} variant="outline" onPress={() => setWeightInput(null)} style={styles.flex} />
              <Button label={t('common.save')} onPress={saveWeight} disabled={!parsedWeight} style={styles.flex} />
            </View>
          </View>
        )}
      </Card>

      <Card>
        <AppText variant="label" style={styles.cardTitle}>
          {t('diet.calculator')}
        </AppText>
        <View style={styles.rowBetween}>
          <View>
            <AppText variant="bodySmall" style={styles.semibold}>
              {t('diet.dailyEnergy')}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {diet?.dailyKcal ? t('diet.setByVet') : t('diet.estimated')}
            </AppText>
          </View>
          <AppText variant="label" style={styles.cardTitle}>
            {dailyKcal ? `${dailyKcal} kcal` : t('diet.addWeightFirst')}
          </AppText>
        </View>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <AppText variant="bodySmall" style={styles.semibold}>
              {t('diet.foodEnergy')}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {t('diet.fromPackage')}
            </AppText>
          </View>
          <Stepper
            label={t('diet.foodEnergy')}
            value={`${per100} kcal/100 g`}
            onLess={() => setPer100(Math.max(40, per100 - 5))}
            onMore={() => setPer100(Math.min(600, per100 + 5))}
          />
        </View>
        <OptionGroup
          label={t('diet.mealsPerDay')}
          look="tint"
          value={meals}
          onChange={setMeals}
          options={[1, 2, 3, 4].map((n) => ({ value: n, label: t('diet.meals', { count: n }) }))}
        />
        {total !== null && (
          <>
            <View style={styles.result}>
              <AppText variant="bodySmall" color={colors.primaryLight}>
                {t('diet.perMeal')}
              </AppText>
              <AppText variant="h1" color={colors.onDark}>
                {`${Math.round(total / meals)} g`}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.muted}>
              {t('diet.totalPerDay', { grams: total })}
            </AppText>
          </>
        )}
      </Card>
    </Screen>
  );
};

export default DietScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  semibold: { fontFamily: fonts.bodySemiBold },
  selfStart: { alignSelf: 'flex-start' },
  link: { minHeight: touchTarget, textAlignVertical: 'center', paddingVertical: 12, marginVertical: -12 },
  card: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  cardTitle: { fontSize: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowGap: { flexDirection: 'row', gap: 10 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background, gap: 2 },
  weightForm: { gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { fontSize: 20, lineHeight: 24 },
  stepValue: { width: 96, textAlign: 'center', fontSize: 14 },
  result: {
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
