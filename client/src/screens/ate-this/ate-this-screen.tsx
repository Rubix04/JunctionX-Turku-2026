import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import ClinicCard from '@/components/features/clinic-card';
import Disclaimer from '@/components/features/disclaimer';
import PetSwitcher from '@/components/features/pet-switcher';
import RiskBadge from '@/components/features/risk-badge';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Note from '@/components/ui/note';
import OptionGroup from '@/components/ui/option-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { LoadingView } from '@/components/ui/state-views';
import TextField from '@/components/ui/text-field';
import { useAsync } from '@/hooks/use-async';
import { getEmergencyClinics } from '@/services/clinics';
import { assessExposure, getSubstance, searchSubstances } from '@/services/knowledge';
import { getPets } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Assessment } from '@/types/knowledge';
import { formatNumber, parseDecimal } from '@/utils/format';

const resultTones = {
  goToEmergencyNow: { background: colors.red, text: colors.onDark },
  callVetNow: { background: colors.redTint, text: colors.redText },
  monitor: { background: colors.yellow, text: colors.text },
  noAction: { background: colors.greenTint, text: colors.greenText },
} as const;

// "My pet ate this": substance and amount -> risk level and where to go next (spec 10).
const AteThisScreen = () => {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ substanceId?: string }>();
  const { data: pets } = useAsync(getPets, []);
  const [petId, setPetId] = useState<string | null>(null);
  const [substanceId, setSubstanceIdState] = useState<string | null>(params.substanceId ?? null);
  const [query, setQuery] = useState('');
  const [variantChoice, setVariantId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: substance } = useAsync(
    () => (substanceId ? getSubstance(substanceId) : Promise.resolve(null)),
    [substanceId, i18n.language],
  );
  const { data: matches } = useAsync(
    () => (substanceId ? Promise.resolve([]) : searchSubstances({ q: query || undefined })),
    [substanceId, query, i18n.language],
  );
  const { data: clinics } = useAsync(getEmergencyClinics, []);

  // A new substance starts over: no variant, amount or result.
  const setSubstanceId = (id: string | null) => {
    setSubstanceIdState(id);
    setVariantId(null);
    setAmount('');
    setAssessment(null);
  };

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const variant =
    substance?.doseOptions?.find((d) => d.variantId === variantChoice) ?? substance?.doseOptions?.[0] ?? null;
  const variantId = variant?.variantId ?? null;
  const amountValue = parseDecimal(amount);

  const assess = async () => {
    if (!substance || !pet) return;
    setBusy(true);
    try {
      setAssessment(
        await assessExposure({
          substanceId: substance.id,
          species: pet.species,
          weightKg: pet.weightKg,
          variantId: amountValue ? variantId : null,
          amount: amountValue,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const header = <ScreenHeader title={t('screens.ateThis')} backIcon="close" />;
  if (!pets) {
    return (
      <Screen header={header}>
        <LoadingView />
      </Screen>
    );
  }

  if (assessment && substance && pet) {
    const tone = resultTones[assessment.action];
    const urgent = assessment.next.callVet;
    return (
      <Screen header={header}>
        <View style={[styles.result, { backgroundColor: tone.background }]}>
          <RiskBadge level={assessment.riskLevel} large />
          <AppText variant="h2" color={tone.text} accessibilityRole="header">
            {t(`ateThis.action.${assessment.action}`, { name: pet.name })}
          </AppText>
          <AppText color={tone.text}>
            {assessment.dose
              ? t('ateThis.dose', {
                  amount: formatNumber(assessment.dose.amount),
                  unit: t(`ateThis.unit.${assessment.dose.unit}`),
                  substance: substance.name.toLowerCase(),
                  mgPerKg: formatNumber(assessment.dose.mgPerKg),
                  compound: assessment.dose.compound,
                })
              : t('ateThis.noDose', { substance: substance.name.toLowerCase(), species: t(`species.${pet.species}`).toLowerCase() })}
          </AppText>
        </View>

        {assessment.notes.map((note) => (
          <Note key={note} icon="info">
            {t(`ateThis.note.${note}`)}
          </Note>
        ))}
        <Note tone="amber" icon="alertTriangle">
          {t('substance.noVomiting')}
        </Note>

        {urgent && clinics?.[0] && (
          <>
            <SectionLabel label={t('result.nearestClinic')} />
            <ClinicCard clinic={clinics[0]} emergency />
          </>
        )}

        <ListGroup>
          {assessment.next.emergencyClinics && (
            <ListRow
              leading={<Icon name="map" size={20} color={colors.red} />}
              title={t('ateThis.emergencyMap')}
              onPress={() => router.push('/explore?mode=emergency')}
            />
          )}
          <ListRow
            leading={<Icon name="book" size={20} color={colors.primary} />}
            title={t('ateThis.readEntry', { substance: substance.name })}
            onPress={() => router.push(`/substance/${substance.id}?species=${pet.species}`)}
          />
        </ListGroup>
        <Button label={t('ateThis.again')} variant="outline" onPress={() => setAssessment(null)} />
        <Disclaimer kind="knowledge" />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        substance && pet ? (
          <Button label={t('ateThis.check')} size="large" variant="danger" onPress={assess} disabled={busy} />
        ) : undefined
      }
    >
      {pets.length > 0 ? (
        <>
          <SectionLabel label={t('ateThis.whichPet')} />
          <View style={styles.pets}>
            <PetSwitcher pets={pets} selectedId={pet?.id ?? null} onSelect={setPetId} showAdd={false} />
          </View>
        </>
      ) : (
        <EmptyPets />
      )}

      <SectionLabel label={t('ateThis.what')} />
      {substance ? (
        <ListGroup>
          <ListRow
            title={substance.name}
            subtitle={substance.categoryLabel}
            trailing={
              <Button label={t('ateThis.change')} variant="outline" size="small" onPress={() => setSubstanceId(null)} />
            }
          />
        </ListGroup>
      ) : (
        <>
          <View style={styles.search}>
            <Icon name="search" size={20} color={colors.muted} />
            <TextInput
              accessibilityLabel={t('knowledge.searchLabel')}
              value={query}
              onChangeText={setQuery}
              placeholder={t('knowledge.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              autoFocus={!params.substanceId}
            />
          </View>
          {matches && (
            <ListGroup>
              {matches.slice(0, 8).map((m) => (
                <ListRow
                  key={m.id}
                  title={m.name}
                  subtitle={m.categoryLabel}
                  trailing={pet ? <RiskBadge level={m.risk[pet.species]} /> : undefined}
                  onPress={() => setSubstanceId(m.id)}
                />
              ))}
            </ListGroup>
          )}
        </>
      )}

      {substance?.doseOptions && (
        <>
          <SectionLabel label={t('ateThis.howMuch')} />
          <OptionGroup
            label={t('ateThis.type')}
            value={variantId}
            onChange={setVariantId}
            columns={substance.doseOptions.length > 2 ? 1 : undefined}
            options={substance.doseOptions.map((d) => ({ value: d.variantId, label: d.label }))}
          />
          <TextField
            label={variant ? t('ateThis.amountIn', { unit: t(`ateThis.unit.${variant.unit}`) }) : t('ateThis.amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={t('ateThis.amountPlaceholder')}
          />
          <AppText variant="caption" color={colors.muted}>
            {pet?.weightKg
              ? t('ateThis.weightUsed', { name: pet.name, kg: formatNumber(pet.weightKg) })
              : t('ateThis.noWeight')}
          </AppText>
        </>
      )}
      <Disclaimer kind="knowledge" />
    </Screen>
  );
};

const EmptyPets = () => {
  const { t } = useTranslation();
  return <Note icon="info">{t('ateThis.noPets')}</Note>;
};

export default AteThisScreen;

const styles = StyleSheet.create({
  pets: { marginHorizontal: -spacing.xl },
  search: {
    minHeight: 52,
    paddingLeft: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: { flex: 1, minHeight: 50, fontFamily: fonts.body, fontSize: 16, color: colors.text },
  result: { padding: 18, borderRadius: 20, gap: spacing.md },
});
