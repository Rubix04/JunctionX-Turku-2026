import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon, { type IconName } from '@/components/ui/icon';
import OptionGroup from '@/components/ui/option-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getHealthStatus, getLogQuestions, saveDailyLog } from '@/services/health';
import { getPet } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { LogAnswer, LogQuestion } from '@/types/health';
import { todayIso } from '@/utils/format';
import { type PickedMedia, pickMedia } from '@/utils/pick-media';

const loadLog = async (petId: string) => {
  const [pet, questions, status] = await Promise.all([getPet(petId), getLogQuestions(petId), getHealthStatus(petId)]);
  return { pet, questions, status };
};

const answerOptions = (q: LogQuestion) => q.options.map((label, index) => ({ value: index as LogAnswer, label }));

const AttachButton = ({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={styles.attach}>
    <Icon name={icon} size={20} color={colors.primary} />
    <AppText variant="bodySmall" color={colors.primary} style={styles.bold}>
      {label}
    </AppText>
  </Pressable>
);

// The 30-second daily log: watch list questions first, then the general ones.
const DailyLogScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadLog(petId), [petId]);
  const [changedAnswers, setAnswers] = useState<Record<string, LogAnswer> | null>(null);
  const [changedAttachments, setAttachments] = useState<PickedMedia[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Start from today's log if there is one, otherwise "as usual" for everything.
  const todaysLog = data?.status.latestLog?.date === todayIso() ? data.status.latestLog : null;
  const answers =
    changedAnswers ??
    Object.fromEntries((data?.questions ?? []).map((q) => [q.id, todaysLog?.answers[q.id] ?? (1 as LogAnswer)]));
  const attachments = changedAttachments ?? todaysLog?.attachments ?? [];

  const header = (
    <ScreenHeader
      title={data ? t('log.title', { name: data.pet.name }) : t('screens.log')}
      subtitle={t('log.duration')}
    />
  );

  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const watchIds = new Set(data.status.watchList?.questions.map((q) => q.id));
  const watchQuestions = data.questions.filter((q) => watchIds.has(q.id));
  const generalQuestions = data.questions.filter((q) => !watchIds.has(q.id));

  const attach = async (kind: 'image' | 'video') => {
    const media = await pickMedia({ source: 'library', kind });
    if (media) setAttachments([...attachments, media]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const level = await saveDailyLog({ petId, date: todayIso(), answers, attachments });
      router.replace(`/pet/${petId}/log-result?level=${level}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={header}
      footer={<Button label={t('log.save')} size="large" onPress={save} disabled={saving} />}
    >
      {watchQuestions.length > 0 && (
        <>
          <View style={styles.watchLabel}>
            <AppText variant="overline" color={colors.primary}>
              {t('log.watchList')}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {t('log.fromVet', { vet: data.status.watchList?.vetName })}
            </AppText>
          </View>
          {watchQuestions.map((q) => (
            <View key={q.id} style={[styles.card, styles.watchCard]}>
              <AppText variant="label">{q.label}</AppText>
              <OptionGroup
                label={q.label}
                options={answerOptions(q)}
                value={answers[q.id] ?? null}
                onChange={(value) => setAnswers({ ...answers, [q.id]: value })}
                warnValues={[...q.yellowIf, ...q.redIf]}
              />
            </View>
          ))}
        </>
      )}

      <SectionLabel label={t('log.general')} />
      {generalQuestions.map((q) => (
        <View key={q.id} style={[styles.card, styles.generalCard]}>
          <AppText variant="label" style={styles.generalLabel}>
            {q.label}
          </AppText>
          <View style={styles.flex}>
            <OptionGroup
              label={q.label}
              options={answerOptions(q)}
              value={answers[q.id] ?? null}
              onChange={(value) => setAnswers({ ...answers, [q.id]: value })}
              warnValues={[...q.yellowIf, ...q.redIf]}
            />
          </View>
        </View>
      ))}

      {attachments.length > 0 && (
        <View style={styles.thumbs}>
          {attachments.map((media, index) => (
            <View key={media.uri} style={styles.thumb}>
              {media.kind === 'image' ? (
                <Image source={{ uri: media.uri }} style={styles.thumbImage} accessibilityLabel={t('log.photo')} />
              ) : (
                <View style={[styles.thumbImage, styles.videoThumb]} accessibilityLabel={t('log.video')}>
                  <Icon name="play" size={22} color={colors.onDark} />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('log.removeAttachment')}
                onPress={() => setAttachments(attachments.filter((_, i) => i !== index))}
                style={styles.removeThumb}
              >
                <Icon name="close" size={14} color={colors.onDark} strokeWidth={2.6} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.attachRow}>
        <AttachButton icon="camera" label={t('log.addPhoto')} onPress={() => attach('image')} />
        <AttachButton icon="video" label={t('log.addVideo')} onPress={() => attach('video')} />
      </View>
    </Screen>
  );
};

export default DailyLogScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  watchLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  card: { borderRadius: radius.lg, borderWidth: 1, backgroundColor: colors.surface, paddingHorizontal: 14 },
  watchCard: { borderColor: colors.primaryBorder, paddingVertical: spacing.md, gap: 10 },
  generalCard: {
    borderColor: colors.border,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generalLabel: { width: 84 },
  attachRow: { flexDirection: 'row', gap: 10, marginTop: spacing.xs },
  attach: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 72, height: 72 },
  thumbImage: { width: 72, height: 72, borderRadius: radius.sm },
  videoThumb: { backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  removeThumb: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
