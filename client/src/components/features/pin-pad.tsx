import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, fonts, spacing } from '@/theme';

export const PIN_LENGTH = 6;

type PinPadProps = {
  title: string;
  /** Called with the full PIN once all digits are entered */
  onComplete: (pin: string) => void;
  error?: string | null;
  /** 'dark' for the teal unlock screen */
  tone?: 'light' | 'dark';
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

const PinPad = ({ title, onComplete, error, tone = 'light' }: PinPadProps) => {
  const { t } = useTranslation();
  const [digits, setDigits] = useState('');
  const isDark = tone === 'dark';
  const textColor = isDark ? colors.onDark : colors.text;

  const press = (key: (typeof KEYS)[number]) => {
    if (key === 'delete') {
      setDigits((current) => current.slice(0, -1));
      return;
    }
    const next = digits + key;
    if (next.length === PIN_LENGTH) {
      setDigits('');
      onComplete(next);
    } else {
      setDigits(next);
    }
  };

  return (
    <View style={styles.container}>
      <AppText variant="title" color={textColor} style={styles.center}>
        {title}
      </AppText>

      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('pinPad.entered', { count: digits.length, total: PIN_LENGTH })}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: textColor },
              i < digits.length && { backgroundColor: textColor },
            ]}
          />
        ))}
      </View>

      <AppText
        variant="bodySmall"
        color={isDark ? colors.onDarkMuted : colors.red}
        accessibilityLiveRegion="polite"
        style={[styles.center, styles.error]}
      >
        {error ?? ''}
      </AppText>

      <View style={styles.keys}>
        {KEYS.map((key) =>
          key === '' ? (
            // The empty slot left of 0. Its key must differ from the digit keys ('9' etc.).
            <View key="empty" style={styles.key} />
          ) : (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'delete' ? t('pinPad.delete') : key}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                key !== 'delete' && {
                  backgroundColor: isDark ? colors.primaryDark : colors.surface,
                },
                pressed && styles.pressed,
              ]}
            >
              {key === 'delete' ? (
                <Icon name="backspace" size={26} color={textColor} />
              ) : (
                <AppText variant="h2" color={textColor} style={styles.digit}>
                  {key}
                </AppText>
              )}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
};

export default PinPad;

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  dots: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  error: { minHeight: 20 },
  keys: {
    width: KEY_SIZE * 3 + spacing.xl * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontFamily: fonts.headingSemiBold },
  pressed: { opacity: 0.6 },
});
