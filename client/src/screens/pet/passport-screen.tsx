import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import PetAvatar from '@/components/features/pet-avatar';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Pill from '@/components/ui/pill';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getCarePlan, getVisits } from '@/services/care';
import { getPassport, vaccinationStatus } from '@/services/passport';
import { getPet } from '@/services/pets';
import { colors } from '@/theme';
import { formatShortDate } from '@/utils/format';

const loadPassport = async (petId: string) => {
  const [pet, passport, visits, plan] = await Promise.all([
    getPet(petId),
    getPassport(petId),
    getVisits(petId),
    getCarePlan(petId),
  ]);
  return { pet, passport, visits, plan };
};

const vaccinationTones = { valid: 'green', dueSoon: 'amber', expired: 'red' } as const;

// Vaccinations, medication, allergies, surgeries and visits in one place (spec 4).
const PassportScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, error, reload } = useAsync(() => loadPassport(petId), [petId]);

  const header = <ScreenHeader title={t('screens.passport')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { pet, passport, visits, plan } = data;
  const sex = passport ? t(`pet.sex.${passport.sex}${passport.neutered ? 'Neutered' : ''}`).toLowerCase() : null;
  const facts = [
    { label: t('passport.born'), value: pet.birthDate ? formatShortDate(pet.birthDate) : '–' },
    { label: t('passport.microchip'), value: passport?.microchip ?? '–' },
    { label: t('passport.owner'), value: passport?.ownerName ?? '–' },
    { label: t('passport.insurance'), value: passport?.policyNumber ?? '–' },
  ];

  return (
    <Screen header={header}>
      <View style={styles.card}>
        <View style={styles.identity}>
          <PetAvatar species={pet.species} photoUrl={pet.photoUrl} size={56} />
          <View style={styles.flex}>
            <AppText variant="h2" color={colors.onDark}>
              {pet.name}
            </AppText>
            <AppText variant="caption" color={colors.onDarkMuted}>
              {[t(`species.${pet.species}`), pet.breed, sex].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
        <View style={styles.facts}>
          {facts.map((fact) => (
            <View key={fact.label} style={styles.fact}>
              <AppText variant="caption" color={colors.onDarkFaint}>
                {fact.label}
              </AppText>
              <AppText variant="label" color={colors.onDark} style={styles.factValue}>
                {fact.value}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <Button
        label={t('passport.share')}
        icon="share"
        onPress={() => router.push(`/pet/${petId}/share-passport`)}
      />

      {!passport ? (
        <EmptyView title={t('passport.empty')} />
      ) : (
        <>
          <SectionLabel label={t('passport.vaccinations')} />
          {passport.vaccinations.length ? (
            <ListGroup>
              {passport.vaccinations.map((v) => {
                const status = vaccinationStatus(v.validUntil);
                return (
                  <ListRow
                    key={v.id}
                    title={v.name}
                    subtitle={t('passport.given', { date: formatShortDate(v.givenOn), clinic: v.clinicName })}
                    trailing={<Pill label={t(`passport.vaccine.${status}`)} tone={vaccinationTones[status]} />}
                  />
                );
              })}
            </ListGroup>
          ) : (
            <EmptyView title={t('passport.none')} />
          )}

          <SectionLabel label={t('passport.medication')} />
          {passport.medications.length ? (
            <ListGroup>
              {passport.medications.map((m) => (
                <ListRow
                  key={m.id}
                  title={m.name}
                  subtitle={[
                    `${formatShortDate(m.startDate)} – ${m.endDate ? formatShortDate(m.endDate) : t('passport.ongoing')}`,
                    m.reason ? t('passport.for', { reason: m.reason.toLowerCase() }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyView title={t('passport.none')} />
          )}

          <View style={styles.twoColumns}>
            <View style={styles.flex}>
              <SectionLabel label={t('passport.allergies')} />
              <ListGroup>
                <ListRow
                  title={
                    passport.allergies.length
                      ? passport.allergies.map((a) => a.allergen).join(', ')
                      : t('passport.noneKnown')
                  }
                  subtitle={
                    passport.allergiesUpdatedOn
                      ? t('passport.updated', { date: formatShortDate(passport.allergiesUpdatedOn) })
                      : null
                  }
                />
              </ListGroup>
            </View>
            <View style={styles.flex}>
              <SectionLabel label={t('passport.surgeries')} />
              <ListGroup>
                {passport.surgeries.length ? (
                  passport.surgeries.map((s) => <ListRow key={s.id} title={s.name} subtitle={String(s.year)} />)
                ) : (
                  <ListRow title={t('passport.none')} />
                )}
              </ListGroup>
            </View>
          </View>
        </>
      )}

      <SectionLabel label={t('passport.visits')} />
      {visits.length ? (
        <ListGroup>
          {visits.map((v) => (
            <ListRow
              key={v.id}
              title={v.title}
              subtitle={[formatShortDate(v.date), v.vetName ?? v.clinicName].join(' · ')}
              href={plan?.visitId === v.id ? `/pet/${petId}/care-plan` : undefined}
            />
          ))}
        </ListGroup>
      ) : (
        <EmptyView title={t('pet.noVisits')} />
      )}
    </Screen>
  );
};

export default PassportScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: 18, borderRadius: 20, backgroundColor: colors.surfaceDark, gap: 14 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  fact: { flexBasis: '50%', gap: 2 },
  factValue: { fontSize: 13.5 },
  twoColumns: { flexDirection: 'row', gap: 10 },
});
