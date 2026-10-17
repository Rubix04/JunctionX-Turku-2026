import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const SharePassportScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.sharePassport')} />;
};

export default SharePassportScreen;
