import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import Disclaimer from '@/components/features/disclaimer';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import Pill from '@/components/ui/pill';
import SegmentedControl from '@/components/ui/segmented-control';
import Screen from '@/components/ui/screen';
import { EmptyView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getEmergencyClinics } from '@/services/clinics';
import { getFirstAidTopic } from '@/services/content';
import { sizeOptions } from '@/screens/emergency/first-aid-screen';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';
import type { FirstAidSize, FirstAidStep } from '@/types/first-aid';
import { currentLanguage, formatShortDate, localize } from '@/utils/format';
import { callNumber } from '@/utils/links';

const speechLanguages = { en: 'en-GB', fi: 'fi-FI', sv: 'sv-SE' } as const;
const sizes: FirstAidSize[] = ['cat', 'smallDog', 'largeDog'];

const stepText = (step: FirstAidStep, size: FirstAidSize) => localize(step.bySize?.[size] ?? step.text);

// Guided compression rhythm for CPR: a pulse and a count from 1 to 30.
const Rhythm = ({ bpm }: { bpm: number }) => {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!running) return;
    const interval = 60_000 / bpm;
    const timer = setInterval(() => {
      setCount((c) => (c % 30) + 1);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: interval * 0.3, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: interval * 0.5, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    }, interval);
    return () => clearInterval(timer);
  }, [running, bpm, scale]);

  return (
    <View style={styles.rhythm}>
      <Animated.View style={[styles.pulse, { transform: [{ scale }] }]}>
        <AppText variant="h1" color={colors.onDark} style={styles.count} accessibilityLiveRegion="polite">
          {running ? String(count) : '30:2'}
        </AppText>
      </Animated.View>
      <AppText variant="bodySmall" color={colors.textSecondary} style={styles.center}>
        {count === 30 ? t('firstAid.breaths') : t('firstAid.rhythmHint', { bpm })}
      </AppText>
      <Button
        label={running ? t('firstAid.stopRhythm') : t('firstAid.startRhythm')}
        icon={running ? 'pause' : 'play'}
        variant={running ? 'outline' : 'danger'}
        onPress={() => {
          setCount(0);
          setRunning(!running);
        }}
      />
    </View>
  );
};

// One first aid guide, step by step, readable aloud for hands-free use (spec 6).
const FirstAidGuideScreen = () => {
  const { t, i18n } = useTranslation();
  const { topic: topicId, size: sizeParam } = useLocalSearchParams<{ topic: string; size?: FirstAidSize }>();
  const { data: topic, loading } = useAsync(() => getFirstAidTopic(topicId), [topicId, i18n.language]);
  const { data: clinics } = useAsync(getEmergencyClinics, []);
  const [size, setSize] = useState<FirstAidSize>(sizeParam && sizes.includes(sizeParam) ? sizeParam : 'cat');
  const [index, setIndex] = useState(0);
  const [voice, setVoice] = useState(false);

  const steps = topic?.steps ?? [];
  const current = steps[index];
  const sizeMatters = steps.some((s) => s.bySize);

  // Read the current step aloud whenever it changes while voice is on.
  useEffect(() => {
    Speech.stop();
    if (voice && current) {
      Speech.speak(`${t('firstAid.stepOf', { step: index + 1, total: steps.length })}. ${stepText(current, size)}`, {
        language: speechLanguages[currentLanguage()],
        rate: 0.95,
      });
    }
  }, [voice, current, index, size, steps.length, t]);

  useEffect(() => () => void Speech.stop(), []);

  const nearest = clinics?.[0];
  const header = <ScreenHeader title={topic ? localize(topic.title) : t('screens.firstAidGuide')} showEmergency={false} />;

  if (!topic) {
    return <Screen header={header}>{!loading && <EmptyView title={t('firstAid.notFound')} />}</Screen>;
  }

  return (
    <Screen
      header={header}
      footer={
        nearest ? (
          <Button
            label={t('firstAid.callClinic', { name: nearest.name })}
            icon="phone"
            variant="danger"
            size="large"
            onPress={() => callNumber(nearest.phone)}
          />
        ) : undefined
      }
    >
      {!topic.reviewed && <Pill label={t('firstAid.sample')} tone="amber" icon="info" />}
      {sizeMatters && (
        <SegmentedControl label={t('firstAid.sizeLabel')} options={sizeOptions(t)} value={size} onChange={setSize} />
      )}

      <View style={styles.stepCard}>
        <View style={styles.stepTop}>
          <AppText variant="overline" color={colors.redText}>
            {t('firstAid.stepOf', { step: index + 1, total: steps.length })}
          </AppText>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: voice }}
            accessibilityLabel={t('firstAid.readAloud')}
            onPress={() => setVoice(!voice)}
            style={[styles.voice, voice && styles.voiceOn]}
          >
            <Icon name="volume" size={20} color={voice ? colors.onDark : colors.primary} />
            <AppText variant="caption" color={voice ? colors.onDark : colors.primary} style={styles.bold}>
              {voice ? t('firstAid.readingAloud') : t('firstAid.readAloud')}
            </AppText>
          </Pressable>
        </View>
        <AppText style={styles.stepText} accessibilityLiveRegion="polite">
          {current ? stepText(current, size) : ''}
        </AppText>
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.nav}>
          <Button
            label={t('firstAid.previous')}
            variant="outline"
            onPress={() => setIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            style={styles.flex}
          />
          {index < steps.length - 1 ? (
            <Button label={t('firstAid.next')} onPress={() => setIndex(index + 1)} style={styles.flex} />
          ) : (
            <Button label={t('firstAid.startOver')} variant="tealOutline" onPress={() => setIndex(0)} style={styles.flex} />
          )}
        </View>
      </View>

      {topic.rhythmBpm && <Rhythm bpm={topic.rhythmBpm} />}

      {topic.id === 'poisoning' && (
        <Button label={t('firstAid.checkSubstance')} icon="search" variant="tealOutline" onPress={() => router.push('/ate-this')} />
      )}

      <AppText variant="caption" color={colors.muted} style={styles.center}>
        {t('firstAid.updated', { date: formatShortDate(topic.updatedOn) })}
      </AppText>
      <Disclaimer kind="firstAid" />
    </Screen>
  );
};

export default FirstAidGuideScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  center: { textAlign: 'center' },
  stepCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.redBorder,
    backgroundColor: colors.surface,
    gap: spacing.lg,
  },
  stepTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  voice: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceOn: { backgroundColor: colors.primary },
  stepText: { fontFamily: fonts.bodySemiBold, fontSize: 21, lineHeight: 30 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 22, backgroundColor: colors.red },
  nav: { flexDirection: 'row', gap: 10 },
  rhythm: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'stretch',
    gap: spacing.md,
  },
  pulse: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontSize: 36 },
});
