import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const BankAuthScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.bankAuth')}
      links={[
        { label: t('screens.setLock'), href: '/set-lock' },
      ]}
    />
  );
};

export default BankAuthScreen;
