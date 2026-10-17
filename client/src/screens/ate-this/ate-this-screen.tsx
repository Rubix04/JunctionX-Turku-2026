import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const AteThisScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.ateThis')} />;
};

export default AteThisScreen;
