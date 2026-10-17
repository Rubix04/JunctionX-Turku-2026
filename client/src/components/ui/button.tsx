import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { colors, fonts, radius, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'outline' | 'tealOutline' | 'danger' | 'dangerOutline';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  /** 'large' for the main action at the bottom of a screen */
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const variants: Record<ButtonVariant, { container: ViewStyle; text: string }> = {
  primary: { container: { backgroundColor: colors.primary }, text: colors.onDark },
  outline: {
    container: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
    text: colors.text,
  },
  tealOutline: {
    container: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
    text: colors.primary,
  },
  danger: { container: { backgroundColor: colors.red }, text: colors.onDark },
  dangerOutline: {
    container: { borderWidth: 1.5, borderColor: colors.red, backgroundColor: colors.surface },
    text: colors.red,
  },
};

const heights = { small: 40, medium: 48, large: 54 };

const Button = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'medium',
  disabled = false,
  accessibilityHint,
  style,
}: ButtonProps) => {
  const { container, text } = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: heights[size], borderRadius: size === 'large' ? radius.lg : radius.md },
        size === 'small' && styles.small,
        container,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <Icon name={icon} size={size === 'small' ? 16 : 20} color={text} />}
      <AppText
        variant="label"
        color={text}
        style={[size === 'large' && styles.largeText, size === 'small' && styles.smallText]}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

export default Button;

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  small: { paddingHorizontal: spacing.md, borderRadius: radius.pill },
  largeText: { fontSize: 16 },
  smallText: { fontSize: 14, fontFamily: fonts.bodyBold },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
