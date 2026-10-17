import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const EmergencyScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.emergency')}
      links={[
        { label: t('screens.firstAid'), href: '/emergency/first-aid' },
      ]}
    />
  );
};

export default EmergencyScreen;
