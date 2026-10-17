import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import EmergencyButton from '@/components/features/emergency-button';
import RiskBadge from '@/components/features/risk-badge';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Note from '@/components/ui/note';
import SegmentedControl from '@/components/ui/segmented-control';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { knowledgeCategories, searchSubstances } from '@/services/knowledge';
import { getPets } from '@/services/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { KnowledgeCategory } from '@/types/knowledge';
import type { Species } from '@/types/pet';

// "Is it safe?": searchable knowledge base with species-specific risk levels (spec 10).
const KnowledgeScreen = () => {
  const { t, i18n } = useTranslation();
  const { data: pets } = useAsync(getPets, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory | null>(null);
  const [speciesChoice, setSpecies] = useState<Species | null>(null);
  const [debounced, setDebounced] = useState('');
  // Default to the species of the user's first pet.
  const species = speciesChoice ?? pets?.[0]?.species ?? 'cat';

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, error, loading, reload } = useAsync(
    () => searchSubstances({ q: debounced || undefined, category: category ?? undefined }),
    [debounced, category, i18n.language],
  );

  const speciesOptions = (['cat', 'dog', 'smallAnimal'] as const).map((s) => ({
    value: s,
    label: pets?.find((p) => p.species === s)?.name ?? t(`species.${s}`),
  }));

  return (
    <Screen
      inTabs
      noPadding
      contentStyle={styles.content}
      header={
        <View style={styles.header}>
          <AppText variant="h1" accessibilityRole="header" style={styles.flex}>
            {t('knowledge.title')}
          </AppText>
          <EmergencyButton />
        </View>
      }
    >
      <ScreenSection>
        <View style={styles.search}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput
            accessibilityLabel={t('knowledge.searchLabel')}
            value={query}
            onChangeText={setQuery}
            placeholder={t('knowledge.searchPlaceholder')}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('knowledge.clear')} onPress={() => setQuery('')} style={styles.clear}>
              <Icon name="close" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <SegmentedControl label={t('knowledge.riskFor')} options={speciesOptions} value={species} onChange={setSpecies} />
      </ScreenSection>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {knowledgeCategories.map((c) => {
          const selected = category === c;
          return (
            <Pressable
              key={c}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => setCategory(selected ? null : c)}
              style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
            >
              <AppText variant="bodySmall" color={selected ? colors.onDark : colors.text} style={styles.chipText}>
                {t(`knowledge.category.${c}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScreenSection>
        <Button
          label={t('knowledge.ateSomething')}
          icon="alertTriangle"
          variant="dangerOutline"
          onPress={() => router.push('/ate-this')}
        />
        {error ? (
          <ErrorView onRetry={reload} />
        ) : !results ? (
          <LoadingView />
        ) : results.length ? (
          <ListGroup style={loading ? styles.stale : undefined}>
            {results.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                subtitle={r.matchedName ? `${r.categoryLabel} · “${r.matchedName}”` : r.categoryLabel}
                trailing={<RiskBadge level={r.risk[species]} />}
                onPress={() => router.push(`/substance/${r.id}?species=${species}`)}
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyView title={t('knowledge.noResults', { query })} body={t('knowledge.noResultsBody')} />
        )}
        <Note icon="info">{t('knowledge.sampleNotice')}</Note>
      </ScreenSection>
    </Screen>
  );
};

export default KnowledgeScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { gap: spacing.md },
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
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  categories: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.border },
  chipText: { fontFamily: fonts.bodySemiBold },
  stale: { opacity: 0.6 },
});
