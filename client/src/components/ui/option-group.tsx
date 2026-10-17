import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, fonts, radius } from '@/theme';

type OptionGroupProps<T extends string | number> = {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Selected options that should look like a warning, e.g. "More" water */
  warnValues?: T[];
  /** 'tint' = light teal with a teal border, as for meals per day */
  look?: 'solid' | 'tint';
  height?: number;
  columns?: number;
};

// Radio buttons laid out as equal-width tiles.
const OptionGroup = <T extends string | number>({
  label,
  options,
  value,
  onChange,
  warnValues = [],
  look = 'solid',
  height = 44,
  columns,
}: OptionGroupProps<T>) => (
  <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
    {options.map((option) => {
      const selected = option.value === value;
      const warn = selected && warnValues.includes(option.value);
      return (
        <Pressable
          key={String(option.value)}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          onPress={() => onChange(option.value)}
          style={[
            styles.option,
            { height, flexBasis: columns ? `${100 / columns - 3}%` : 0 },
            selected ? (look === 'tint' ? styles.tint : styles.selected) : styles.idle,
            warn && styles.warn,
          ]}
        >
          <AppText
            variant="bodySmall"
            numberOfLines={1}
            adjustsFontSizeToFit
            color={selected && look === 'solid' && !warn ? colors.onDark : selected ? colors.primary : colors.text}
            style={[styles.text, warn && { color: colors.text }]}
          >
            {option.label}
          </AppText>
        </Pressable>
      );
    })}
  </View>
);

export default OptionGroup;

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: {
    flexGrow: 1,
    minWidth: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  idle: { backgroundColor: colors.background, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tint: { backgroundColor: colors.primaryTint, borderColor: colors.primary, borderWidth: 2 },
  warn: { backgroundColor: colors.yellow, borderColor: colors.yellowBorder },
  text: { fontFamily: fonts.bodyBold, fontSize: 13.5 },
});
