import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, fonts, radius } from '@/theme';

type SegmentedControlProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// Grey track with a white selected segment, e.g. "By week / 3 months".
const SegmentedControl = <T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) => (
  <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.track}>
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected }}
          onPress={() => onChange(option.value)}
          style={[styles.segment, selected && styles.selected]}
        >
          <AppText variant="bodySmall" color={selected ? colors.text : colors.muted} style={styles.text}>
            {option.label}
          </AppText>
        </Pressable>
      );
    })}
  </View>
);

export default SegmentedControl;

const styles = StyleSheet.create({
  track: {
    height: 44,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.segmentBackground,
    flexDirection: 'row',
    gap: 4,
  },
  segment: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.surface },
  text: { fontFamily: fonts.bodyBold },
});
