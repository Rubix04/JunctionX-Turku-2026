import { useTranslation } from 'react-i18next';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Screen from '@/components/ui/screen';
import { colors } from '@/theme';

const AccessibilityScreen = () => {
  const { t } = useTranslation();
  const paragraphs = t('profile.accessibilityBody', { returnObjects: true }) as string[];

  return (
    <Screen header={<ScreenHeader title={t('profile.accessibility')} />}>
      {paragraphs.map((text) => (
        <AppText key={text} variant="body" color={colors.textSecondary}>
          {text}
        </AppText>
      ))}
      <AppText variant="caption" color={colors.muted}>
        {t('profile.accessibilityUpdated')}
      </AppText>
    </Screen>
  );
};

export default AccessibilityScreen;
