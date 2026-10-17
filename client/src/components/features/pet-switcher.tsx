import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import PetAvatar from '@/components/features/pet-avatar';
import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, fonts, spacing } from '@/theme';
import type { Pet } from '@/types/pet';

type PetSwitcherProps = {
  pets: Pet[];
  selectedId: string | null;
  onSelect: (petId: string) => void;
  /** Shows the dashed "add a pet" button */
  showAdd?: boolean;
};

// One tab per pet, switched with one tap (spec 11).
const PetSwitcher = ({ pets, selectedId, onSelect, showAdd = true }: PetSwitcherProps) => {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={t('home.yourPets')}
      contentContainerStyle={styles.row}
    >
      {pets.map((pet) => {
        const selected = pet.id === selectedId;
        return (
          <Pressable
            key={pet.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(pet.id)}
            style={[styles.tab, selected ? styles.selected : styles.idle]}
          >
            <PetAvatar species={pet.species} photoUrl={pet.photoUrl} size={36} />
            <AppText variant="label" color={selected ? colors.onDark : colors.text} style={styles.name}>
              {pet.name}
            </AppText>
          </Pressable>
        );
      })}
      {showAdd && (
        <Link href="/add-pet" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={t('screens.addPet')} style={styles.add}>
            <Icon name="plus" size={22} color={colors.primary} />
          </Pressable>
        </Link>
      )}
    </ScrollView>
  );
};

export default PetSwitcher;

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.xl, gap: 10 },
  tab: {
    height: 52,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  name: { fontFamily: fonts.bodyBold },
  add: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
