import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import CheckboxRow from '@/components/ui/checkbox-row';
import { ListGroup } from '@/components/ui/list-group';
import OptionGroup from '@/components/ui/option-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { useAsync } from '@/hooks/use-async';
import { createShare, stopShare } from '@/services/passport';
import { getPet } from '@/services/pets';
import { colors, radius, spacing } from '@/theme';
import type { PassportSection, PassportShare } from '@/types/passport';

const sectionGroups: { id: string; sections: PassportSection[] }[] = [
  { id: 'vaccinations', sections: ['vaccinations'] },
  { id: 'medicationAllergies', sections: ['medications', 'allergies'] },
  { id: 'surgeriesVisits', sections: ['surgeries', 'visits'] },
  { id: 'logs', sections: ['logs'] },
];

const durations = [
  { hours: 24, key: 'hours24' },
  { hours: 24 * 7, key: 'days7' },
  { hours: 24 * 30, key: 'days30' },
] as const;

// Share the passport with a vet or pet care as a link or QR code (spec 4). Needs consent.
const SharePassportScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data: pet } = useAsync(() => getPet(petId), [petId]);
  const [included, setIncluded] = useState<Record<string, boolean>>({
    vaccinations: true,
    medicationAllergies: true,
    surgeriesVisits: true,
    logs: false,
  });
  const [hours, setHours] = useState<number>(24 * 7);
  const [share, setShare] = useState<PassportShare | null>(null);
  const [busy, setBusy] = useState(false);

  const sections = sectionGroups.filter((g) => included[g.id]).flatMap((g) => g.sections);
  const durationLabel = t(`share.${durations.find((d) => d.hours === hours)?.key ?? 'days7'}`);

  const create = async () => {
    setBusy(true);
    try {
      setShare(await createShare(petId, sections, hours));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (share) await stopShare(share.id);
    setShare(null);
  };

  const header = (
    <ScreenHeader
      title={t('share.title', { name: pet?.name ?? '' })}
      backIcon="close"
      showEmergency={false}
    />
  );

  if (share) {
    return (
      <Screen header={header} contentStyle={styles.done}>
        <View style={styles.qr} accessible accessibilityLabel={t('share.qrA11y')}>
          <QRCode value={share.url} size={180} color={colors.text} backgroundColor={colors.surface} />
        </View>
        <AppText variant="h2" style={styles.center}>
          {t('share.showAtClinic')}
        </AppText>
        <AppText color={colors.textSecondary} style={styles.center}>
          {t('share.expires', { duration: durationLabel })}
        </AppText>
        <AppText variant="caption" color={colors.muted} style={styles.center} selectable>
          {share.url}
        </AppText>
        <View style={styles.row}>
          <Button
            label={t('share.sendLink')}
            icon="send"
            onPress={() => Share.share({ message: t('share.message', { name: pet?.name ?? '', url: share.url }) })}
            style={styles.flex}
          />
          <Button label={t('share.stop')} variant="dangerOutline" onPress={stop} style={styles.flex} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <Button
          label={t('share.agreeCreate')}
          size="large"
          onPress={create}
          disabled={busy || sections.length === 0}
        />
      }
    >
      <SectionLabel label={t('share.include')} />
      <ListGroup>
        {sectionGroups.map((group) => (
          <CheckboxRow
            key={group.id}
            label={t(`share.section.${group.id}`)}
            checked={included[group.id]}
            onChange={(checked) => setIncluded({ ...included, [group.id]: checked })}
          />
        ))}
      </ListGroup>
      <SectionLabel label={t('share.worksFor')} />
      <OptionGroup
        label={t('share.worksFor')}
        value={hours}
        onChange={setHours}
        height={46}
        options={durations.map((d) => ({ value: d.hours, label: t(`share.${d.key}`) }))}
      />
      <AppText variant="caption" color={colors.muted}>
        {t('share.consent')}
      </AppText>
    </Screen>
  );
};

export default SharePassportScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  done: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.lg },
  qr: {
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  radius: { borderRadius: radius.md },
});
