import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import PetAvatar from '@/components/features/pet-avatar';
import TrafficLightBadge from '@/components/features/traffic-light-badge';
import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import Screen from '@/components/ui/screen';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getHealthStatus } from '@/services/health';
import { getPets } from '@/services/pets';
import { colors, radius, spacing } from '@/theme';
import { ageInYears } from '@/utils/format';

const loadPets = async () => {
  const pets = await getPets();
  const statuses = await Promise.all(pets.map((pet) => getHealthStatus(pet.id)));
  return { pets, statuses };
};

// All pets in the household; each card opens the pet page.
const PetsScreen = () => {
  const { t } = useTranslation();
  const { data, error, reload } = useAsync(loadPets, []);
  useReloadOnFocus(reload);

  const header = (
    <View style={styles.header}>
      <AppText variant="h1" accessibilityRole="header" style={styles.flex}>
        {t('pets.title')}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('screens.addPet')}
        onPress={() => router.push('/add-pet')}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
      >
        <Icon name="plus" size={22} color={colors.onDark} />
      </Pressable>
    </View>
  );

  if (!data) {
    return (
      <Screen inTabs header={header}>
        {error ? <ErrorView onRetry={reload} /> : <LoadingView />}
      </Screen>
    );
  }

  const { pets, statuses } = data;

  return (
    <Screen inTabs header={header}>
      {pets.length === 0 && <EmptyView title={t('home.noPetsTitle')} body={t('home.noPetsBody')} />}
      {pets.map((pet, index) => (
        <Pressable
          key={pet.id}
          accessibilityRole="link"
          onPress={() => router.push(`/pet/${pet.id}`)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <PetAvatar species={pet.species} photoUrl={pet.photoUrl} size={64} />
          <View style={styles.texts}>
            <AppText variant="title">{pet.name}</AppText>
            <AppText variant="caption" color={colors.muted}>
              {[
                pet.breed ?? t(`species.${pet.species}`),
                pet.birthDate ? t('pet.years', { count: ageInYears(pet.birthDate) }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
            <View style={styles.badge}>
              <TrafficLightBadge level={statuses[index].level} />
            </View>
          </View>
          <Icon name="chevronRight" size={20} color={colors.muted} />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/add-pet')}
        style={({ pressed }) => [styles.addCard, pressed && styles.pressed]}
      >
        <Icon name="plus" size={20} color={colors.primary} />
        <AppText variant="label" color={colors.primary}>
          {t('screens.addPet')}
        </AppText>
      </Pressable>
    </Screen>
  );
};

export default PetsScreen;

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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  texts: { flex: 1, gap: 2 },
  badge: { marginTop: spacing.sm, alignItems: 'flex-start' },
  addCard: {
    minHeight: 64,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },
});
