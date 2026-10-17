import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const SubstanceScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.substance')} />;
};

export default SubstanceScreen;
