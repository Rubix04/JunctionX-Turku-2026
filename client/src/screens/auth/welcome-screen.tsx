import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const WelcomeScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.welcome')}
      links={[
        { label: t('screens.bankAuth'), href: '/bank-auth' },
        { label: t('screens.unlock'), href: '/unlock' },
        { label: t('screens.emergency'), href: '/emergency' },
      ]}
    />
  );
};

export default WelcomeScreen;
