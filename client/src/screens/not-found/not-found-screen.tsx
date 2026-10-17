import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const NotFoundScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.notFound')}
      links={[
        { label: t('screens.home'), href: '/' },
      ]}
    />
  );
};

export default NotFoundScreen;
