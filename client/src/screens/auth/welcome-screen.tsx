import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppLogo from '@/components/features/app-logo';
import PetAvatar from '@/components/features/pet-avatar';
import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { changeLanguage, type Language, supportedLanguages } from '@/i18n';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';

const features: { icon: IconName; iconColor: string; key: 'watchList' | 'trafficLight' | 'help' }[] =
  [
    { icon: 'list', iconColor: colors.primary, key: 'watchList' },
    { icon: 'trafficLight', iconColor: colors.primary, key: 'trafficLight' },
    { icon: 'emergency', iconColor: colors.red, key: 'help' },
  ];

const LanguageMenu = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = i18n.language as Language;

  const pick = (language: Language) => {
    setOpen(false);
    changeLanguage(language);
  };

  return (
    <View style={styles.languageWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('welcome.languageButton', { name: t(`languages.${current}`) })}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.languageButton}
      >
        <Icon name="globe" size={18} color={colors.primary} />
        <AppText variant="label">{current.toUpperCase()}</AppText>
        <Icon name="chevronDown" size={16} strokeWidth={2.2} />
      </Pressable>

      {open && (
        <View style={styles.languageMenu} accessibilityRole="menu">
          {supportedLanguages.map((language) => {
            const selected = language === current;
            return (
              <Pressable
                key={language}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => pick(language)}
                style={[styles.languageOption, selected && styles.languageOptionSelected]}
              >
                <AppText
                  variant="body"
                  style={[styles.languageName, selected && { fontFamily: fonts.bodyBold }]}
                >
                  {t(`languages.${language}`)}
                </AppText>
                <AppText variant="caption" color={colors.muted}>
                  {language.toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const WelcomeScreen = () => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <LanguageMenu />

        <View style={styles.hero}>
          <PetAvatar species="cat" size={88} />
          <PetAvatar species="dog" size={112} />
          <View style={styles.heroLogo}>
            <AppLogo size={44} variant="light" />
          </View>
        </View>

        <AppText variant="h1" accessibilityRole="header" style={styles.title}>
          {t('welcome.title')}
        </AppText>

        <View style={styles.features}>
          {features.map(({ icon, iconColor, key }) => (
            <View key={key} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon name={icon} size={18} color={iconColor} />
              </View>
              <AppText variant="body" style={styles.featureText}>
                <AppText variant="body" style={{ fontFamily: fonts.bodyBold }}>
                  {t(`welcome.${key}Bold`)}
                </AppText>
                {t(`welcome.${key}Rest`)}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/bank-auth')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Icon name="bank" size={20} color={colors.onDark} />
            <AppText variant="label" color={colors.onDark} style={styles.buttonLabel}>
              {t('welcome.signIn')}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/emergency')}
            style={({ pressed }) => [styles.emergencyButton, pressed && styles.pressed]}
          >
            <Icon name="emergency" size={18} color={colors.red} />
            <AppText variant="label" color={colors.red}>
              {t('welcome.emergencyNow')}
            </AppText>
          </Pressable>

          <AppText variant="caption" color={colors.muted} style={styles.disclaimer}>
            {t('common.notAVet')}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: 22,
  },
  languageWrap: { alignItems: 'flex-end', zIndex: 2 },
  languageButton: {
    height: touchTarget,
    paddingLeft: 14,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  languageMenu: {
    position: 'absolute',
    top: touchTarget + spacing.sm,
    right: 0,
    width: 200,
    padding: 6,
    gap: 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  languageOption: {
    height: touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageOptionSelected: { backgroundColor: colors.primaryTint },
  languageName: { flex: 1 },
  hero: {
    height: 180,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  heroLogo: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  title: { lineHeight: 31 },
  features: { gap: 14 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  actions: { marginTop: 'auto', gap: spacing.md },
  primaryButton: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: { fontSize: 16, textAlign: 'center', flexShrink: 1 },
  emergencyButton: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  disclaimer: { textAlign: 'center', lineHeight: 18 },
  pressed: { opacity: 0.85 },
});
