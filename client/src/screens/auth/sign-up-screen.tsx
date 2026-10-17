import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Screen from '@/components/ui/screen';
import TextField from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { EmailAuthError } from '@/services/auth';
import { colors, spacing } from '@/theme';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/utils/validation';

type Field = 'name' | 'email' | 'password' | 'confirmPassword';
type Errors = Partial<Record<Field | 'form', string>>;

const SignUpScreen = () => {
  const { t } = useTranslation();
  const { signUpWithEmail } = useAuth();
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field: Field) => (text: string) => setValues({ ...values, [field]: text });

  const validate = (): Errors => {
    const { name, email, password, confirmPassword } = values;
    const found: Errors = {};
    if (!name.trim()) found.name = t('auth.errors.required');
    if (!email.trim()) found.email = t('auth.errors.required');
    else if (!isValidEmail(email)) found.email = t('auth.errors.invalidEmail');
    if (!password) found.password = t('auth.errors.required');
    else if (password.length < MIN_PASSWORD_LENGTH) found.password = t('auth.errors.passwordTooShort');
    if (confirmPassword !== password) found.confirmPassword = t('auth.errors.passwordMismatch');
    return found;
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      return;
    }
    setSubmitting(true);
    try {
      // The root layout switches to the tabs once signed in.
      await signUpWithEmail({ name: values.name, email: values.email, password: values.password });
    } catch (error) {
      setErrors({
        form:
          error instanceof EmailAuthError
            ? t(`auth.errors.${error.code}`)
            : t('auth.errors.generic'),
      });
      setSubmitting(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader />}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label={t('auth.signUp.submit')} size="large" loading={submitting} onPress={submit} />
          <Pressable accessibilityRole="link" onPress={() => router.replace('/sign-in')} hitSlop={8}>
            <AppText variant="bodySmall" color={colors.muted} style={styles.center}>
              {t('auth.signUp.haveAccount')}{' '}
              <AppText variant="label" color={colors.primary}>
                {t('auth.signUp.signInLink')}
              </AppText>
            </AppText>
          </Pressable>
        </View>
      }
    >
      <View style={styles.intro}>
        <AppText variant="h1" accessibilityRole="header">
          {t('auth.signUp.title')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {t('auth.signUp.intro')}
        </AppText>
      </View>

      <View style={styles.fields}>
        <TextField
          label={t('auth.signUp.name')}
          value={values.name}
          onChangeText={set('name')}
          error={errors.name}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          value={values.email}
          onChangeText={set('email')}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <View style={styles.passwordField}>
          <TextField
            label={t('auth.password')}
            value={values.password}
            onChangeText={set('password')}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {!errors.password && (
            <AppText variant="caption" color={colors.muted}>
              {t('auth.signUp.passwordHint')}
            </AppText>
          )}
        </View>
        <TextField
          label={t('auth.signUp.confirmPassword')}
          value={values.confirmPassword}
          onChangeText={set('confirmPassword')}
          error={errors.confirmPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>

      {errors.form && (
        <AppText variant="bodySmall" color={colors.red} accessibilityLiveRegion="polite">
          {errors.form}
        </AppText>
      )}
    </Screen>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  intro: { gap: 10 },
  fields: { gap: spacing.lg },
  passwordField: { gap: 6 },
  footer: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  center: { textAlign: 'center' },
});
