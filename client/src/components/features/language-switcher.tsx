import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { changeLanguage, type Language, supportedLanguages } from '@/i18n';
import { colors, fonts, radius, spacing } from '@/theme';
import { currentLanguage } from '@/utils/format';

const languageNames: Record<Language, string> = { en: 'English', fi: 'Suomi', sv: 'Svenska' };

type LanguageSwitcherProps = {
  /** 'onDark' over video and photos, 'default' on the light background */
  tone?: 'onDark' | 'default';
};

// EN / FI / SV pill. The choice is remembered on this device.
const LanguageSwitcher = ({ tone = 'default' }: LanguageSwitcherProps) => {
  const { t } = useTranslation();
  const active = currentLanguage();
  const onDark = tone === 'onDark';

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.language')}
      style={[styles.pill, onDark ? styles.pillOnDark : styles.pillDefault]}
    >
      <Icon name="globe" size={16} color={onDark ? colors.onDark : colors.muted} />
      {supportedLanguages.map((lang) => {
        const selected = lang === active;
        return (
          <Pressable
            key={lang}
            accessibilityRole="radio"
            accessibilityLabel={languageNames[lang]}
            accessibilityState={{ selected }}
            onPress={() => changeLanguage(lang)}
            hitSlop={4}
            style={[styles.option, selected && (onDark ? styles.selectedOnDark : styles.selectedDefault)]}
          >
            <AppText
              variant="caption"
              style={styles.code}
              color={selected ? (onDark ? colors.primary : colors.onDark) : onDark ? colors.onDark : colors.text}
            >
              {lang.toUpperCase()}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

export default LanguageSwitcher;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    paddingLeft: 10,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  pillOnDark: {
    backgroundColor: 'rgba(8, 63, 112, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  pillDefault: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  option: {
    minWidth: 36,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOnDark: { backgroundColor: colors.surface },
  selectedDefault: { backgroundColor: colors.primary },
  code: { fontFamily: fonts.bodyBold, letterSpacing: 0.5 },
});
