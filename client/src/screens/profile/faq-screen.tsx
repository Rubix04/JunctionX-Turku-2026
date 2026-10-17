import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import Screen from '@/components/ui/screen';
import { colors, radius, spacing } from '@/theme';

type FaqItem = { q: string; a: string };

// Common questions, one open at a time.
const FaqScreen = () => {
  const { t } = useTranslation();
  const items = t('profile.faqItems', { returnObjects: true }) as FaqItem[];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen header={<ScreenHeader title={t('profile.faq')} />}>
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <Pressable
            key={item.q}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setOpen(expanded ? null : index)}
            style={styles.item}
          >
            <View style={styles.question}>
              <AppText variant="label" style={styles.flex}>
                {item.q}
              </AppText>
              <View style={expanded && styles.flipped}>
                <Icon name="chevronDown" size={20} color={colors.primary} />
              </View>
            </View>
            {expanded && (
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {item.a}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </Screen>
  );
};

export default FaqScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  question: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flipped: { transform: [{ rotate: '180deg' }] },
});
