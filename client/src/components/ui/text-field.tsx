import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors, fonts, radius } from '@/theme';

type TextFieldProps = TextInputProps & { label: string; error?: string | null };

// Labelled text input.
const TextField = ({ label, error, style, ...props }: TextFieldProps) => (
  <View style={styles.field}>
    <AppText variant="label" style={styles.label}>
      {label}
    </AppText>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={colors.muted}
      style={[styles.input, error ? styles.inputError : null, style]}
      {...props}
    />
    {error ? (
      <AppText variant="caption" color={colors.red}>
        {error}
      </AppText>
    ) : null}
  </View>
);

export default TextField;

const styles = StyleSheet.create({
  field: { gap: 6, flex: 1 },
  label: { fontSize: 14 },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.red },
});
