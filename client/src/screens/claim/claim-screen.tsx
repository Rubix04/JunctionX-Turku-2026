import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import PetSwitcher from '@/components/features/pet-switcher';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import CheckboxRow from '@/components/ui/checkbox-row';
import Icon, { type IconName } from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Note from '@/components/ui/note';
import Screen from '@/components/ui/screen';
import SectionLabel from '@/components/ui/section-label';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import TextField from '@/components/ui/text-field';
import { useAsync } from '@/hooks/use-async';
import { createClaim, getPolicies } from '@/services/insurance';
import { getPets } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Claim, ClaimAttachment } from '@/types/insurance';
import { formatEuros, formatLongDate, parseDecimal, parseFinnishDate, todayIso } from '@/utils/format';
import { pickMedia } from '@/utils/pick-media';

const loadClaimForm = async () => {
  const [pets, policies] = await Promise.all([getPets(), getPolicies()]);
  return { pets, policies };
};

/** Today as dd.mm.yyyy, the format the date field takes */
const todayFinnish = () => {
  const [year, month, day] = todayIso().split('-');
  return `${Number(day)}.${Number(month)}.${year}`;
};

const MAX_ATTACHMENTS = 5;

const AttachButton = ({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.attach, pressed && styles.pressed]}
  >
    <Icon name={icon} size={22} color={colors.primary} />
    <AppText variant="caption" style={styles.bold}>
      {label}
    </AppText>
  </Pressable>
);

/** Shown after sending: what happens next, and the way back to the claims list */
const SentView = ({ claim, petName }: { claim: Claim; petName: string }) => {
  const { t } = useTranslation();
  return (
    <Screen
      header={<ScreenHeader title={t('screens.claim')} backIcon="close" />}
      footer={<Button label={t('claim.backToInsurance')} size="large" onPress={() => router.back()} />}
    >
      <View style={styles.sent}>
        <View style={styles.sentIcon}>
          <Icon name="check" size={36} color={colors.onDark} strokeWidth={3} />
        </View>
        <AppText variant="h1" accessibilityRole="header" style={styles.center}>
          {t('claim.sentTitle')}
        </AppText>
        <AppText color={colors.textSecondary} style={styles.center}>
          {t('claim.sentBody', { name: petName })}
        </AppText>
      </View>
      <ListGroup>
        <ListRow title={t('claim.reference')} subtitle={`C-${claim.id.slice(-6)}`} />
        <ListRow title={claim.title} subtitle={`${formatLongDate(claim.date)} · ${claim.clinicName ?? ''}`} />
        <ListRow title={t('claim.amountLabel')} subtitle={formatEuros(claim.amount ?? 0, true)} />
      </ListGroup>
      <Note icon="clock">{t('claim.sentNext')}</Note>
    </Screen>
  );
};

// Claim vet costs afterwards with a receipt (contracted clinics with direct payment need no claim).
const ClaimScreen = () => {
  const { t } = useTranslation();
  const { petId: initialPetId } = useLocalSearchParams<{ petId?: string }>();
  const { data, error, reload } = useAsync(loadClaimForm, []);

  const [petId, setPetId] = useState<string | null>(initialPetId ?? null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayFinnish);
  const [clinic, setClinic] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<ClaimAttachment[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [sent, setSent] = useState<Claim | null>(null);

  const header = <ScreenHeader title={t('screens.claim')} backIcon="close" />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  // Only pets with a policy can be claimed for.
  const insuredPets = data.pets.filter((p) => data.policies.some((policy) => policy.petId === p.id));
  const pet = insuredPets.find((p) => p.id === petId) ?? insuredPets[0];
  const policy = pet ? data.policies.find((p) => p.petId === pet.id) : undefined;

  if (sent) {
    return <SentView claim={sent} petName={pet?.name ?? ''} />;
  }

  if (!pet || !policy) {
    return (
      <Screen header={header}>
        <Note icon="shieldCheck">{t('claim.noPolicy')}</Note>
      </Screen>
    );
  }

  const remaining = Math.max(0, policy.coverLimit - policy.usedThisYear);
  const treatmentDate = parseFinnishDate(date);
  const amountEuros = amount.trim() ? parseDecimal(amount) : null;
  const errors = {
    title: !title.trim() ? t('claim.titleRequired') : null,
    date: !treatmentDate || treatmentDate > todayIso() ? t('claim.dateInvalid') : null,
    clinic: !clinic.trim() ? t('claim.clinicRequired') : null,
    amount: !amountEuros || amountEuros <= 0 ? t('claim.amountInvalid') : null,
    attachments: attachments.length === 0 ? t('claim.receiptRequired') : null,
    confirmed: !confirmed ? t('claim.confirmRequired') : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const overCover = amountEuros !== null && amountEuros > remaining;

  const addAttachment = (attachment: ClaimAttachment) =>
    setAttachments((current) => (current.length < MAX_ATTACHMENTS ? [...current, attachment] : current));

  const attachPhoto = async (source: 'camera' | 'library') => {
    const media = await pickMedia({ source, kind: 'image' });
    if (media) addAttachment({ uri: media.uri, name: t('claim.receiptPhoto'), kind: 'image' });
  };

  const attachFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    const asset = picked.canceled ? null : picked.assets[0];
    if (asset) {
      addAttachment({ uri: asset.uri, name: asset.name, kind: asset.mimeType?.startsWith('image') ? 'image' : 'pdf' });
    }
  };

  const send = async () => {
    setSubmitted(true);
    if (!valid || !treatmentDate || !amountEuros) return;
    setSending(true);
    setSendError(false);
    try {
      const claim = await createClaim({
        petId: pet.id,
        title: title.trim(),
        treatmentDate,
        clinicName: clinic.trim(),
        amount: amountEuros,
        description: description.trim() || null,
        attachments,
      });
      setSent(claim);
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      header={header}
      footer={<Button label={t('claim.send')} icon="send" size="large" onPress={send} loading={sending} />}
    >
      {insuredPets.length > 1 && (
        <View style={styles.pets}>
          <PetSwitcher pets={insuredPets} selectedId={pet.id} onSelect={setPetId} showAdd={false} />
        </View>
      )}

      <View style={styles.policy}>
        <Icon name="shieldCheck" size={20} color={colors.primary} />
        <View style={styles.flex}>
          <AppText variant="label">{`${policy.plan} · ${policy.number}`}</AppText>
          <AppText variant="caption" color={colors.muted}>
            {t('home.coverLeft', { amount: formatEuros(remaining) })}
          </AppText>
        </View>
      </View>

      <SectionLabel label={t('claim.treatment')} />
      <TextField
        label={t('claim.title')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('claim.titlePlaceholder')}
        error={submitted ? errors.title : null}
      />
      <View style={styles.row}>
        <TextField
          label={t('claim.date')}
          value={date}
          onChangeText={setDate}
          placeholder={t('addPet.datePlaceholder')}
          keyboardType="numbers-and-punctuation"
          error={submitted ? errors.date : null}
        />
        <TextField
          label={t('claim.amount')}
          value={amount}
          onChangeText={setAmount}
          placeholder="0,00"
          keyboardType="decimal-pad"
          error={submitted ? errors.amount : null}
        />
      </View>
      {overCover && (
        <Note icon="alertTriangle" tone="amber">
          {t('claim.overCover', { amount: formatEuros(remaining) })}
        </Note>
      )}
      <TextField
        label={t('claim.clinic')}
        value={clinic}
        onChangeText={setClinic}
        placeholder={t('claim.clinicPlaceholder')}
        autoCapitalize="words"
        error={submitted ? errors.clinic : null}
      />
      <View style={styles.field}>
        <AppText variant="label" style={styles.label}>
          {t('claim.description')}
        </AppText>
        <TextInput
          accessibilityLabel={t('claim.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t('claim.descriptionPlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.textArea}
          textAlignVertical="top"
        />
      </View>

      <SectionLabel label={t('claim.receipts')} />
      <AppText variant="bodySmall" color={colors.textSecondary}>
        {t('claim.receiptsHint')}
      </AppText>
      {attachments.length > 0 && (
        <View style={styles.attachments}>
          {attachments.map((a, index) => (
            <View key={`${a.uri}-${index}`} style={styles.attachment}>
              {a.kind === 'image' ? (
                <Image source={{ uri: a.uri }} style={styles.thumb} accessible={false} />
              ) : (
                <View style={[styles.thumb, styles.pdf]}>
                  <AppText variant="caption" color={colors.redText} style={styles.bold}>
                    PDF
                  </AppText>
                </View>
              )}
              <AppText variant="bodySmall" numberOfLines={1} style={styles.flex}>
                {a.name}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('claim.removeReceipt', { name: a.name })}
                hitSlop={8}
                onPress={() => setAttachments(attachments.filter((_, i) => i !== index))}
              >
                <Icon name="trash" size={20} color={colors.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {attachments.length < MAX_ATTACHMENTS && (
        <View style={styles.attachRow}>
          <AttachButton icon="camera" label={t('claim.takePhoto')} onPress={() => attachPhoto('camera')} />
          <AttachButton icon="image" label={t('claim.fromGallery')} onPress={() => attachPhoto('library')} />
          <AttachButton icon="file" label={t('claim.fromFiles')} onPress={attachFile} />
        </View>
      )}
      {submitted && errors.attachments && (
        <AppText variant="caption" color={colors.red}>
          {errors.attachments}
        </AppText>
      )}

      <View style={styles.confirm}>
        <CheckboxRow label={t('claim.confirm')} checked={confirmed} onChange={setConfirmed} />
      </View>
      {submitted && errors.confirmed && (
        <AppText variant="caption" color={colors.red}>
          {errors.confirmed}
        </AppText>
      )}

      {sendError && (
        <Note icon="alertTriangle" tone="red">
          {t('claim.sendFailed')}
        </Note>
      )}
      <Note icon="lock">{t('claim.payoutNote')}</Note>
    </Screen>
  );
};

export default ClaimScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  pets: { marginHorizontal: -spacing.xl },
  row: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  label: { fontSize: 14 },
  policy: {
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textArea: {
    minHeight: 110,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  attachRow: { flexDirection: 'row', gap: spacing.sm },
  attach: {
    flex: 1,
    height: 80,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  attachments: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
  },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  pdf: { backgroundColor: colors.redTint, alignItems: 'center', justifyContent: 'center' },
  confirm: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sent: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  sentIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
