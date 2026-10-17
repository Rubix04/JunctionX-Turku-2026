import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import ClinicCard from '@/components/features/clinic-card';
import EmergencyButton from '@/components/features/emergency-button';
import SchematicMap from '@/components/features/schematic-map';
import AppText from '@/components/ui/app-text';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Pill from '@/components/ui/pill';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getClinics } from '@/services/clinics';
import { colors, fonts, radius, spacing } from '@/theme';
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

const FilterChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
  >
    <AppText variant="bodySmall" color={selected ? colors.onDark : colors.text} style={styles.chipText}>
      {label}
    </AppText>
  </Pressable>
);

const matches = (clinic: Clinic, f: Filters) =>
  (!f.openNow || isOpenNow(clinic)) &&
  (!f.emergency || clinic.emergency24h) &&
  (!f.contractedOnly || clinic.contracted) &&
  (!f.species || clinic.species.includes(f.species)) &&
  (!f.maxKm || clinic.distanceKm <= f.maxKm);

// Contracted vets and emergency clinics (spec 7). In emergency mode the 24 h clinics come
// first, ordered by opening status and distance.
const MapScreen = () => {
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { data: clinics, error, reload } = useAsync(getClinics, []);
  const [filters, setFilters] = useState<Filters>(mode === 'emergency' ? emergencyFilters : defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appliedMode, setAppliedMode] = useState(mode);

  // Opened again in emergency mode while the tab was already open: show the 24 h clinics.
  if (mode !== appliedMode) {
    setAppliedMode(mode);
    if (mode === 'emergency') setFilters(emergencyFilters);
  }

  const toggle = (key: 'openNow' | 'emergency' | 'contractedOnly') => setFilters({ ...filters, [key]: !filters[key] });
  const header = (
    <View style={styles.header}>
      <AppText variant="h1" accessibilityRole="header" style={styles.flex}>
        {t('map.title')}
      </AppText>
      <EmergencyButton />
    </View>
  );

  if (!clinics) {
    return (
      <Screen inTabs header={header}>
        {error ? <ErrorView onRetry={reload} /> : <LoadingView />}
      </Screen>
    );
  }

  const shown = clinics.filter((c) => matches(c, filters));
  const selected = shown.find((c) => c.id === selectedId) ?? null;

  return (
    <Screen inTabs header={header} noPadding contentStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <FilterChip label={t('map.filter.openNow')} selected={filters.openNow} onPress={() => toggle('openNow')} />
        <FilterChip label={t('map.filter.emergency')} selected={filters.emergency} onPress={() => toggle('emergency')} />
        <FilterChip
          label={t('map.filter.contracted')}
          selected={filters.contractedOnly}
          onPress={() => toggle('contractedOnly')}
        />
        {(['dog', 'cat', 'smallAnimal'] as const).map((s) => (
          <FilterChip
            key={s}
            label={t(`species.${s}Plural`)}
            selected={filters.species === s}
            onPress={() => setFilters({ ...filters, species: filters.species === s ? null : s })}
          />
        ))}
        <FilterChip
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
                  onPress={() => router.push(`/clinic/${c.id}`)}
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
    </Screen>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { gap: spacing.md },
  filters: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.border },
  chipText: { fontFamily: fonts.bodySemiBold },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
