import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, radius, spacing } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const Button = ({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) => {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText variant="label" color={isPrimary ? colors.onDark : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
};

export default Button;

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
