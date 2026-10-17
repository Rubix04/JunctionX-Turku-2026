import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const DietScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.diet')} />;
};

export default DietScreen;
