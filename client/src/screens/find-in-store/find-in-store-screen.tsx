import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import SchematicMap from '@/components/features/schematic-map';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import IconTile from '@/components/ui/icon-tile';
import Note from '@/components/ui/note';
import Pill, { type PillTone } from '@/components/ui/pill';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getProduct, getStoresForProduct } from '@/services/clinics';
import { colors, fonts, radius, spacing } from '@/theme';
import type { StockStatus, Store } from '@/types/clinic';
import { formatNumber } from '@/utils/format';
import { callNumber, openDirections } from '@/utils/links';
import { isOpenNow } from '@/utils/opening-hours';

const stockTones: Record<StockStatus, PillTone> = {
  inStock: 'green',
  lowStock: 'amber',
  outOfStock: 'red',
  sellsBrand: 'neutral',
};

const loadStores = async (productId: string) => {
  const [product, stores] = await Promise.all([getProduct(productId), getStoresForProduct(productId)]);
  return { product, stores };
};

type Filters = { openNow: boolean; online: boolean; near: boolean };

// Vet-recommended products in nearby stores (spec 8). Not for prescription medicines.
const FindInStoreScreen = () => {
  const { t } = useTranslation();
  const { productId = 'urinary-wet' } = useLocalSearchParams<{ productId?: string }>();
  const { data, error, reload } = useAsync(() => loadStores(productId), [productId]);
  const [filters, setFilters] = useState<Filters>({ openNow: false, online: false, near: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const header = <ScreenHeader title={t('screens.findInStore')} />;
  if (!data) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const { product, stores } = data;
  const shown = stores.filter(
    (s: Store) =>
      (!filters.openNow || isOpenNow(s)) && (!filters.online || s.onlineOrder) && (!filters.near || s.distanceKm <= 5),
  );
  const toggle = (key: keyof Filters) => setFilters({ ...filters, [key]: !filters[key] });

  return (
    <Screen header={header} noPadding contentStyle={styles.content}>
      <ScreenSection>
        {product && (
          <View style={styles.product}>
            <IconTile name="bowl" size={44} />
            <View style={styles.flex}>
              <AppText variant="label">{product.name}</AppText>
              <AppText variant="caption" color={colors.muted}>
                {product.brand}
              </AppText>
            </View>
            <Pill label={t('store.vetRecommended')} icon="shieldCheck" />
          </View>
        )}
      </ScreenSection>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {(['openNow', 'near', 'online'] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: filters[key] }}
            onPress={() => toggle(key)}
            style={[styles.chip, filters[key] ? styles.chipOn : styles.chipOff]}
          >
            <AppText variant="bodySmall" color={filters[key] ? colors.onDark : colors.text} style={styles.chipText}>
              {t(`store.filter.${key}`)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <ScreenSection>
        <SchematicMap
          height={200}
          selectedId={selectedId}
          onSelect={setSelectedId}
          pins={shown.map((s) => ({ id: s.id, label: s.name, x: s.mapX, y: s.mapY, kind: s.partner ? 'partnerStore' : 'store' }))}
        />
        {shown.length ? (
          shown.map((store) => {
            const stock = store.stock[productId] ?? 'sellsBrand';
            const open = isOpenNow(store);
            return (
              <Pressable
                key={store.id}
                accessibilityRole="button"
                onPress={() => setSelectedId(store.id)}
                style={[styles.store, selectedId === store.id && styles.storeSelected]}
              >
                <View style={styles.storeTop}>
                  <View style={styles.flex}>
                    <AppText variant="label">{store.name}</AppText>
                    <AppText variant="caption" color={colors.muted}>
                      {[
                        t('clinic.distance', { km: formatNumber(store.distanceKm) }),
                        open ? t('clinic.openNow') : t('clinic.closed'),
                        t(`store.kind.${store.kind}`),
                      ].join(' · ')}
                    </AppText>
                  </View>
                  <Pill label={t(`store.stock.${stock}`)} tone={stockTones[stock]} />
                </View>
                <View style={styles.tags}>
                  {store.onlineOrder && <Pill label={t('store.orderOnline')} tone="teal" />}
                  {store.partner && <Pill label={t('store.partner')} tone="amber" />}
                </View>
                <View style={styles.actions}>
                  <Button label={t('clinic.call')} icon="phone" variant="outline" size="small" onPress={() => callNumber(store.phone)} style={styles.flex} />
                  <Button
                    label={t('clinic.directions')}
                    icon="directions"
                    variant="outline"
                    size="small"
                    onPress={() => openDirections(store.address)}
                    style={styles.flex}
                  />
                </View>
              </Pressable>
            );
          })
        ) : (
          <EmptyView title={t('store.noResults')} />
        )}
        <Note icon="info">{t('store.note')}</Note>
      </ScreenSection>
    </Screen>
  );
};

export default FindInStoreScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.md },
  product: {
    padding: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filters: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.border },
  chipText: { fontFamily: fonts.bodySemiBold },
  store: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  storeSelected: { borderColor: colors.primary, borderWidth: 2 },
  storeTop: { flexDirection: 'row', gap: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', gap: 10 },
});
