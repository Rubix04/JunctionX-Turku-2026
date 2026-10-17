import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const HomeScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.home')}
      links={[
        { label: t('screens.pet'), href: '/pet/mirri' },
        { label: t('screens.addPet'), href: '/add-pet' },
        { label: t('screens.addVisit'), href: '/add-visit' },
        { label: t('screens.emergency'), href: '/emergency' },
      ]}
    />
  );
};

export default HomeScreen;
