import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const AddVisitScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.addVisit')} />;
};

export default AddVisitScreen;
