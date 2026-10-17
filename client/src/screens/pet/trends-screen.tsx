import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const TrendsScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.trends')} />;
};

export default TrendsScreen;
