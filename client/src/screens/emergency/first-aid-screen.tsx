import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const FirstAidScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.firstAid')}
      links={[
        { label: t('screens.firstAidGuide'), href: '/emergency/cpr' },
      ]}
    />
  );
};

export default FirstAidScreen;
