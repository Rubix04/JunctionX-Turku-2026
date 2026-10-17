import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const MapScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.map')}
      links={[
        { label: t('screens.clinic'), href: '/clinic/1' },
        { label: t('screens.findInStore'), href: '/find-in-store' },
      ]}
    />
  );
};

export default MapScreen;
