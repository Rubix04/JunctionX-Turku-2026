import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ClinicCard from '@/components/features/clinic-card';
import Disclaimer from '@/components/features/disclaimer';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { addReminder } from '@/services/care';
import { getEmergencyClinics } from '@/services/clinics';
import { getHealthStatus, getLogQuestions } from '@/services/health';
import { getPet } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { TrafficLightLevel } from '@/types/health';
import { formatDayMonth, formatTime, todayIso } from '@/utils/format';

const loadResult = async (petId: string) => {
  const [pet, status, questions, clinics] = await Promise.all([
    getPet(petId),
    getHealthStatus(petId),
    getLogQuestions(petId),
    getEmergencyClinics(),
  ]);
  return { pet, status, questions, clinic: clinics[0] ?? null };
};

const heroColors: Record<TrafficLightLevel, { background: string; text: string; body: string }> = {
  green: { background: colors.green, text: colors.onDark, body: colors.greenTint },
  yellow: { background: colors.yellow, text: colors.text, body: colors.text },
  red: { background: colors.red, text: colors.onDark, body: colors.redOnDarkBody },
};

const levels: TrafficLightLevel[] = ['red', 'yellow', 'green'];

const NumberBadge = ({ label, warn = false }: { label: string; warn?: boolean }) => (
  <View style={[styles.number, warn && styles.numberWarn]}>
    <AppText variant="bodySmall" color={warn ? colors.redText : colors.primary} style={styles.bold}>
      {label}
    </AppText>
  </View>
);

// Traffic light result after a daily log. Thresholds come from the vet's watch list.
const LogResultScreen = () => {
  const { t } = useTranslation();
  const { petId, level: levelParam } = useLocalSearchParams<{ petId: string; level?: TrafficLightLevel }>();
  const { data, error, reload } = useAsync(() => loadResult(petId), [petId]);
  const [whyOpen, setWhyOpen] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  if (!data) {
    return <Screen>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pet, status, questions, clinic } = data;
  const level: TrafficLightLevel = levelParam && levels.includes(levelParam) ? levelParam : status.level;
  const hero = heroColors[level];
  const watchList = status.watchList;
  const log = status.latestLog;
  const flagged = questions.filter((q) => {
    const answer = log?.answers[q.id];
    return answer !== undefined && (level === 'red' ? q.redIf : [...q.yellowIf, ...q.redIf]).includes(answer);
  });
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/pet/${petId}`));

  const remindTonight = async () => {
    await addReminder({
      petId,
      kind: 'visit',
      title: t('result.reminderTitle'),
      detail: t('result.reminderDetail'),
      dueAt: `${todayIso()}T19:00:00`,
    });
    setReminderSet(true);
  };

  return (
    <Screen
      noPadding
      background={hero.background}
      contentStyle={styles.content}
      header={
        <View style={{ backgroundColor: hero.background }}>
          <ScreenHeader
            backIcon="close"
            onBack={close}
            onColor
            showEmergency={level !== 'red'}
            trailing={
              level === 'red' && log ? (
                <AppText variant="bodySmall" color={colors.redOnDark} style={styles.bold}>
                  {`${pet.name} · ${formatDayMonth(log.date)} ${formatTime(new Date().toISOString())}`}
                </AppText>
              ) : undefined
            }
          />
        </View>
      }
    >
      <StatusBar style={level === 'yellow' ? 'dark' : 'light'} />
      <View style={[styles.hero, { backgroundColor: hero.background }]}>
        <View style={styles.dots} accessible={false}>
          {(['green', 'yellow', 'red'] as const).map((l) => (
            <View key={l} style={[styles.dot, l === level ? { backgroundColor: hero.text } : styles.dotOff]} />
          ))}
        </View>
        <AppText variant="h1" color={hero.text} accessibilityRole="header" style={styles.heroTitle}>
          {t(`result.${level}Title`, { name: pet.name })}
        </AppText>
        <AppText color={hero.body}>
          {level === 'red' && watchList
            ? watchList.redReason
            : flagged.length
              ? t('result.noticed', { items: flagged.map((q) => `${q.label.toLowerCase()}: ${q.options[log!.answers[q.id]].toLowerCase()}`).join(', ') })
              : t(`result.${level}Body`, { name: pet.name })}
        </AppText>
        {level === 'yellow' && (
          <AppText color={hero.body} style={styles.bold}>
            {t('result.notEmergency')}
          </AppText>
        )}
      </View>

      <ScreenSection>
        {level === 'red' ? (
          <>
            <SectionLabel label={t('result.nearestClinic')} />
            {clinic && <ClinicCard clinic={clinic} emergency />}
            <ListGroup>
              <ListRow
                title={t('result.otherClinics')}
                onPress={() => router.push('/(tabs)/(map)?mode=emergency')}
              />
              <ListRow
                title={t('result.showPassport', { name: pet.name })}
                onPress={() => router.push(`/pet/${petId}/passport`)}
              />
              <ListRow title={t('result.firstAid')} onPress={() => router.push('/emergency/first-aid')} />
            </ListGroup>
            <Disclaimer kind="result" />
            <AppText variant="caption" color={colors.muted} style={styles.center}>
              {t('result.ifUnsure')}
            </AppText>
          </>
        ) : (
          <>
            <SectionLabel label={t('result.whatToDo')} />
            <ListGroup>
              {(level === 'yellow' && watchList?.yellowAdvice.length
                ? watchList.yellowAdvice
                : [t(`result.${level}Advice`, { name: pet.name })]
              ).map((advice, index) => (
                <View key={advice} style={styles.adviceRow}>
                  <NumberBadge label={String(index + 1)} />
                  <AppText style={styles.flex}>{advice}</AppText>
                </View>
              ))}
              {watchList && (
                <View style={styles.adviceRow}>
                  <NumberBadge label="!" warn />
                  <AppText style={styles.flex}>
                    <AppText style={styles.bold}>{t('result.turnsRedIf')}</AppText> {watchList.redWhen}
                  </AppText>
                </View>
              )}
            </ListGroup>

            <View style={styles.why}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: whyOpen }}
                onPress={() => setWhyOpen(!whyOpen)}
                style={styles.whyHeader}
              >
                <AppText variant="label" style={styles.flex}>
                  {t(`result.why.${level}`)}
                </AppText>
                <Icon name="chevronDown" size={18} color={colors.muted} />
              </Pressable>
              {whyOpen && (
                <AppText variant="bodySmall" color={colors.textSecondary}>
                  {watchList
                    ? t('result.whyBody', { vet: watchList.vetName, condition: watchList.condition.toLowerCase() })
                    : t('result.whyBodyGeneral')}
                </AppText>
              )}
            </View>

            <View style={styles.actions}>
              {level === 'yellow' && (
                <Button
                  label={reminderSet ? t('result.reminderSet') : t('result.remindMe')}
                  icon={reminderSet ? 'check' : 'bell'}
                  onPress={remindTonight}
                  disabled={reminderSet}
                  style={styles.flex}
                />
              )}
              <Button
                label={t('screens.trends')}
                variant="outline"
                onPress={() => router.push(`/pet/${petId}/trends`)}
                style={level === 'green' ? styles.flex : undefined}
              />
            </View>
            <Disclaimer kind="result" />
          </>
        )}
      </ScreenSection>
    </Screen>
  );
};

export default LogResultScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  center: { textAlign: 'center' },
  content: { gap: spacing.xl, flexGrow: 1, backgroundColor: colors.background },
  hero: { paddingHorizontal: spacing.xxl, paddingBottom: 26, paddingTop: spacing.sm, gap: spacing.sm },
  heroTitle: { fontSize: 28, lineHeight: 33 },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 18, height: 18, borderRadius: 9 },
  dotOff: { borderWidth: 2, borderColor: 'rgba(20,35,43,0.25)', backgroundColor: 'rgba(255,255,255,0.35)' },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberWarn: { backgroundColor: colors.redTint },
  adviceRow: { padding: spacing.md, paddingHorizontal: 14, flexDirection: 'row', gap: spacing.md },
  why: {
    padding: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  whyHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
});
