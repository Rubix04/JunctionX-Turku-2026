import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const InsuranceScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.insurance')} />;
};

export default InsuranceScreen;
