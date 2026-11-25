import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import ClinicCard from '@/components/features/clinic-card';
import Note from '@/components/ui/note';
import SchematicMap from '@/components/features/schematic-map';
import AppText from '@/components/ui/app-text';
import Chip from '@/components/ui/chip';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Pill from '@/components/ui/pill';
import { ScreenSection } from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useBookingLabel } from '@/hooks/use-booking-label';
import { getClinics } from '@/services/clinics';
import { colors, fonts, spacing } from '@/theme';
import type { Clinic } from '@/types/clinic';
import type { Species } from '@/types/pet';
import { formatNumber } from '@/utils/format';
import { isOpenNow } from '@/utils/opening-hours';

type Filters = {
  openNow: boolean;
  emergency: boolean;
  contractedOnly: boolean;
  species: Species | null;
  maxKm: number | null;
};

const defaultFilters: Filters = { openNow: false, emergency: false, contractedOnly: false, species: null, maxKm: null };
const emergencyFilters: Filters = { ...defaultFilters, emergency: true };
const speciesValues: Species[] = ['dog', 'cat', 'smallAnimal'];

type MapParams = { mode?: string; species?: string; reminder?: string };

/** Filters a link asks for: 24 h clinics in emergency mode, contracted clinics for the pet's species when booking */
const filtersFor = ({ mode, species }: MapParams): Filters => {
  if (mode === 'emergency') return emergencyFilters;
  if (mode === 'book') {
    const pet = speciesValues.find((s) => s === species) ?? null;
    return { ...defaultFilters, contractedOnly: true, species: pet };
  }
  return defaultFilters;
};

const matches = (clinic: Clinic, f: Filters) =>
  (!f.openNow || isOpenNow(clinic)) &&
  (!f.emergency || clinic.emergency24h) &&
  (!f.contractedOnly || clinic.contracted) &&
  (!f.species || clinic.species.includes(f.species)) &&
  (!f.maxKm || clinic.distanceKm <= f.maxKm);

// Contracted vets and emergency clinics (spec 7), shown in the Explore tab. With ?mode=emergency the 24 h clinics come
// first, ordered by opening status and distance. With ?mode=book (from a reminder's Book button) it shows contracted
// clinics for the pet's species and says what is being booked.
const MapSection = () => {
  const { t } = useTranslation();
  const params = useLocalSearchParams<MapParams>();
  const { data: clinics, error, reload } = useAsync(getClinics, []);
  const [filters, setFilters] = useState<Filters>(() => filtersFor(params));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const linkKey = [params.mode, params.species, params.reminder].join('|');
  const [appliedLink, setAppliedLink] = useState(linkKey);
  // The reminder a Book button came from; its text is looked up, never taken from the link.
  const [bookingReminder, setBookingReminder] = useState(params.mode === 'book' ? (params.reminder ?? null) : null);
  const bookingFor = useBookingLabel(bookingReminder);

  // Opened again from a link while the tab was already open: apply that link's filters.
  if (linkKey !== appliedLink) {
    setAppliedLink(linkKey);
    if (params.mode) setFilters(filtersFor(params));
    setBookingReminder(params.mode === 'book' ? (params.reminder ?? null) : null);
  }

  const toggle = (key: 'openNow' | 'emergency' | 'contractedOnly') => setFilters({ ...filters, [key]: !filters[key] });
  if (!clinics) {
    return <ScreenSection>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</ScreenSection>;
  }

  const shown = clinics.filter((c) => matches(c, filters));
  const selected = shown.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      {bookingFor && (
        <ScreenSection>
          <Note
            icon="calendar"
            tone="amber"
            trailing={
              <AppText
                variant="bodySmall"
                color={colors.accentDark}
                style={styles.bold}
                accessibilityRole="button"
                onPress={() => setBookingReminder(null)}
              >
                {t('common.close')}
              </AppText>
            }
          >
            {t('map.bookingFor', { what: bookingFor })}
          </Note>
        </ScreenSection>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label={t('map.filter.openNow')} selected={filters.openNow} onPress={() => toggle('openNow')} />
        <Chip label={t('map.filter.emergency')} selected={filters.emergency} onPress={() => toggle('emergency')} />
        <Chip
          label={t('map.filter.contracted')}
          selected={filters.contractedOnly}
          onPress={() => toggle('contractedOnly')}
        />
        {speciesValues.map((s) => (
          <Chip
            key={s}
            label={t(`species.${s}Plural`)}
            selected={filters.species === s}
            onPress={() => setFilters({ ...filters, species: filters.species === s ? null : s })}
          />
        ))}
        <Chip
          label={t('map.filter.within', { km: 5 })}
          selected={filters.maxKm === 5}
          onPress={() => setFilters({ ...filters, maxKm: filters.maxKm === 5 ? null : 5 })}
        />
      </ScrollView>

      <ScreenSection>
        <SchematicMap
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          pins={shown.map((c) => ({
            id: c.id,
            label: c.name,
            x: c.mapX,
            y: c.mapY,
            kind: c.contracted ? 'contracted' : 'other',
            emergency: c.emergency24h,
          }))}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <AppText variant="caption" color={colors.textSecondary}>
              {t('map.legend.contracted')}
            </AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.muted }]} />
            <AppText variant="caption" color={colors.textSecondary}>
              {t('map.legend.other')}
            </AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
            <AppText variant="caption" color={colors.textSecondary}>
              {t('map.legend.emergency')}
            </AppText>
          </View>
        </View>

        {selected && <ClinicCard clinic={selected} emergency={selected.emergency24h && filters.emergency} />}

        {shown.length ? (
          <ListGroup>
            {shown.map((c) => {
              const open = isOpenNow(c);
              return (
                <ListRow
                  key={c.id}
                  title={c.name}
                  subtitle={[
                    t('clinic.distance', { km: formatNumber(c.distanceKm) }),
                    c.emergency24h ? t('clinic.emergency24h') : open ? t('clinic.openNow') : t('clinic.closed'),
                    c.contracted ? t('clinic.contracted') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  trailing={c.directPayment ? <Pill label={t('clinic.directPaymentShort')} /> : undefined}
                  onPress={() =>
                    router.push(
                      bookingReminder
                        ? { pathname: '/clinic/[id]', params: { id: c.id, reminder: bookingReminder } }
                        : `/clinic/${c.id}`,
                    )
                  }
                />
              );
            })}
          </ListGroup>
        ) : (
          <EmptyView title={t('map.noResults')} body={t('map.noResultsBody')} />
        )}
        <AppText variant="caption" color={colors.muted} style={styles.center}>
          {t('map.registryNote')}
        </AppText>
      </ScreenSection>
    </>
  );
};

export default MapSection;

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  filters: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  bold: { fontFamily: fonts.bodyBold },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
