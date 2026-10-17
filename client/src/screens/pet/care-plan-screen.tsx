import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const CarePlanScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.carePlan')} />;
};

export default CarePlanScreen;
