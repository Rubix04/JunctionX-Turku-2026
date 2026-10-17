import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const FindInStoreScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.findInStore')} />;
};

export default FindInStoreScreen;
