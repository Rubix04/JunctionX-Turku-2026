import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import Disclaimer from '@/components/features/disclaimer';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import IconTile from '@/components/ui/icon-tile';
import SegmentedControl from '@/components/ui/segmented-control';
import Screen from '@/components/ui/screen';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { getFirstAidTopics } from '@/services/content';
import { getPets } from '@/services/pets';
import { colors, radius, spacing } from '@/theme';
import type { FirstAidSize } from '@/types/first-aid';
import type { Pet } from '@/types/pet';
import { localize } from '@/utils/format';

/** Cats and small animals use the cat technique; dogs over 15 kg the large dog one. */
export const sizeForPet = (pet: Pet): FirstAidSize =>
  pet.species === 'dog' ? ((pet.weightKg ?? 0) > 15 ? 'largeDog' : 'smallDog') : 'cat';

export const sizeOptions = (t: (key: string) => string) =>
  (['cat', 'smallDog', 'largeDog'] as const).map((s) => ({ value: s, label: t(`firstAid.size.${s}`) }));

// Emergency mode, stage 2: first aid guides by topic and size (spec 6).
const FirstAidScreen = () => {
  const { t, i18n } = useTranslation();
  const isSignedIn = useAuth().status === 'signedIn';
  const { data: topics } = useAsync(getFirstAidTopics, [i18n.language]);
  const { data: pets } = useAsync(() => (isSignedIn ? getPets() : Promise.resolve([])), [isSignedIn]);
  const [sizeChoice, setSize] = useState<FirstAidSize | null>(null);
  const size = sizeChoice ?? (pets?.[0] ? sizeForPet(pets[0]) : 'cat');

  return (
    <Screen header={<ScreenHeader title={t('firstAid.title')} showEmergency={false} />}>
      <AppText color={colors.textSecondary}>{t('firstAid.intro')}</AppText>
      <SegmentedControl label={t('firstAid.sizeLabel')} options={sizeOptions(t)} value={size} onChange={setSize} />
      <View style={styles.list}>
        {topics?.map((topic) => (
          <Pressable
            key={topic.id}
            accessibilityRole="button"
            onPress={() => router.push(`/emergency/${topic.id}?size=${size}`)}
            style={({ pressed }) => [styles.topic, pressed && styles.pressed]}
          >
            <IconTile name={topic.icon} tone="red" size={48} />
            <View style={styles.flex}>
              <AppText variant="label">{localize(topic.title)}</AppText>
              <AppText variant="caption" color={colors.muted}>
                {localize(topic.when)}
              </AppText>
            </View>
            <Icon name="chevronRight" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <Disclaimer kind="firstAid" />
    </Screen>
  );
};

export default FirstAidScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: 10 },
  topic: {
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.redTint },
});
