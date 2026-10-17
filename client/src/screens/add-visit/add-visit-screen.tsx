import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import PetSwitcher from '@/components/features/pet-switcher';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon, { type IconName } from '@/components/ui/icon';
import Note from '@/components/ui/note';
import Screen from '@/components/ui/screen';
import { useAsync } from '@/hooks/use-async';
import { addVisitDraft } from '@/services/care';
import { getPets } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import { pickMedia } from '@/utils/pick-media';

type Source = 'file' | 'photo' | 'text';
type Upload = { name: string; kind: 'pdf' | 'image' | 'text' };

const sources: { id: Source; icon: IconName }[] = [
  { id: 'file', icon: 'file' },
  { id: 'photo', icon: 'camera' },
  { id: 'text', icon: 'edit' },
];

// Steps shown while the AI layer reads the notes. It only summarises; the clinic confirms.
const steps = ['read', 'draft', 'clinic'] as const;

const StepRow = ({ state, title, subtitle }: { state: 'done' | 'active' | 'waiting'; title: string; subtitle?: string }) => (
  <View style={styles.step}>
    {state === 'done' ? (
      <View style={[styles.stepDot, styles.stepDone]}>
        <Icon name="check" size={14} color={colors.onDark} strokeWidth={3} />
      </View>
    ) : (
      <View style={[styles.stepDot, state === 'active' ? styles.stepActive : styles.stepWaiting]} />
    )}
    <View style={styles.flex}>
      <AppText style={state === 'active' && styles.bold} color={state === 'waiting' ? colors.muted : colors.text}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color={colors.muted}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  </View>
);

// Upload visit notes; they become a draft care plan and watch list (spec 2).
const AddVisitScreen = () => {
  const { t } = useTranslation();
  const { petId: initialPetId } = useLocalSearchParams<{ petId?: string }>();
  const { data: pets } = useAsync(getPets, []);
  const [petId, setPetId] = useState<string | null>(initialPetId ?? null);
  const [source, setSource] = useState<Source>('file');
  const [text, setText] = useState('');
  const [upload, setUpload] = useState<Upload | null>(null);
  const [progress, setProgress] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0];

  // Fake processing: one step per second until it waits for the clinic.
  useEffect(() => {
    if (!upload || progress >= 2) return;
    const timer = setTimeout(() => setProgress((p) => p + 1), 1000);
    return () => clearTimeout(timer);
  }, [upload, progress]);

  const start = async (picked: Upload) => {
    setUpload(picked);
    setProgress(0);
    if (pet) await addVisitDraft(pet.id, t('addVisit.draftTitle'), '');
  };

  const chooseSource = async (id: Source) => {
    setSource(id);
    if (id === 'file') {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
      const asset = result.canceled ? null : result.assets[0];
      if (asset) start({ name: asset.name, kind: asset.mimeType?.startsWith('image') ? 'image' : 'pdf' });
    } else if (id === 'photo') {
      const media = await pickMedia({ source: 'camera', kind: 'image' });
      if (media) start({ name: t('addVisit.photoName'), kind: 'image' });
    }
  };

  return (
    <Screen
      header={<ScreenHeader title={t('screens.addVisit')} backIcon="close" />}
      footer={
        upload && pet ? (
          <Button
            label={t('addVisit.preview')}
            size="large"
            disabled={progress < 2}
            onPress={() => router.replace(`/pet/${pet.id}/care-plan`)}
          />
        ) : source === 'text' ? (
          <Button
            label={t('addVisit.send')}
            size="large"
            disabled={text.trim().length < 10}
            onPress={() => start({ name: t('addVisit.typedName'), kind: 'text' })}
          />
        ) : undefined
      }
    >
      {pets && pets.length > 1 && !upload && (
        <View style={styles.pets}>
          <PetSwitcher pets={pets} selectedId={pet?.id ?? null} onSelect={setPetId} showAdd={false} />
        </View>
      )}
      <AppText color={colors.textSecondary}>{t('addVisit.intro', { name: pet?.name ?? '' })}</AppText>

      <View style={styles.sources}>
        {sources.map((s) => {
          const selected = s.id === source;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => chooseSource(s.id)}
              disabled={Boolean(upload)}
              style={[styles.source, selected ? styles.sourceSelected : styles.sourceIdle]}
            >
              <Icon name={s.icon} size={24} color={colors.primary} />
              <AppText variant="caption" style={styles.bold}>
                {t(`addVisit.source.${s.id}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {source === 'text' && !upload && (
        <TextInput
          accessibilityLabel={t('addVisit.source.text')}
          value={text}
          onChangeText={setText}
          multiline
          placeholder={t('addVisit.textPlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.textArea}
          textAlignVertical="top"
        />
      )}

      {upload && (
        <>
          <View style={styles.file}>
            <View style={styles.fileBadge}>
              <AppText variant="caption" color={colors.redText} style={styles.fileType}>
                {upload.kind === 'pdf' ? 'PDF' : upload.kind === 'image' ? 'IMG' : 'TXT'}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="label" numberOfLines={1}>
                {upload.name}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                {t('addVisit.uploaded')}
              </AppText>
            </View>
          </View>
          <View style={styles.steps}>
            {steps.map((step, index) => (
              <StepRow
                key={step}
                state={index < progress ? 'done' : index === progress ? 'active' : 'waiting'}
                title={t(`addVisit.step.${step}`)}
                subtitle={step === 'clinic' ? t('addVisit.step.clinicHint') : undefined}
              />
            ))}
          </View>
        </>
      )}

      <Note>{t('addVisit.aiNote')}</Note>
    </Screen>
  );
};

export default AddVisitScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  pets: { marginHorizontal: -spacing.xl },
  sources: { flexDirection: 'row', gap: spacing.sm },
  source: {
    flex: 1,
    height: 92,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sourceSelected: { borderWidth: 2, borderColor: colors.primary },
  sourceIdle: { borderWidth: 1, borderColor: colors.border },
  textArea: {
    minHeight: 160,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  file: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fileBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.redTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileType: { fontFamily: fonts.bodyBold, fontSize: 11 },
  steps: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 14,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: colors.green },
  stepActive: { borderWidth: 2.5, borderColor: colors.primary },
  stepWaiting: { borderWidth: 2, borderColor: colors.borderStrong },
});
