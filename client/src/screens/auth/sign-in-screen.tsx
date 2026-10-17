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
import { colors, radius, spacing } from '@/theme';
import { isValidEmail } from '@/utils/validation';

type Errors = { email?: string; password?: string; form?: string };

const SignInScreen = () => {
  const { t } = useTranslation();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Errors => ({
    email: !email.trim()
      ? t('auth.errors.required')
      : !isValidEmail(email)
        ? t('auth.errors.invalidEmail')
        : undefined,
    password: !password ? t('auth.errors.required') : undefined,
  });

  const submit = async () => {
    const found = validate();
    setErrors(found);
    if (found.email || found.password) {
      return;
    }
    setSubmitting(true);
    try {
      // The root layout switches to the tabs once signed in.
      await signInWithEmail(email, password);
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
          <Button label={t('auth.signIn.submit')} size="large" loading={submitting} onPress={submit} />
          <Pressable accessibilityRole="link" onPress={() => router.replace('/sign-up')} hitSlop={8}>
            <AppText variant="bodySmall" color={colors.muted} style={styles.center}>
              {t('auth.signIn.noAccount')}{' '}
              <AppText variant="label" color={colors.primary}>
                {t('auth.signIn.signUpLink')}
              </AppText>
            </AppText>
          </Pressable>
        </View>
      }
    >
      <View style={styles.intro}>
        <AppText variant="h1" accessibilityRole="header">
          {t('auth.signIn.title')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {t('auth.signIn.intro')}
        </AppText>
      </View>

      <View style={styles.fields}>
        <TextField
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>

      {errors.form && (
        <AppText variant="bodySmall" color={colors.red} accessibilityLiveRegion="polite">
          {errors.form}
        </AppText>
      )}

      <View style={styles.demo}>
        <AppText variant="caption" color={colors.noteText}>
          {t('auth.signIn.demoHint')}
        </AppText>
      </View>
    </Screen>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  intro: { gap: 10 },
  fields: { gap: spacing.lg },
  demo: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryTint },
  footer: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  center: { textAlign: 'center' },
});
