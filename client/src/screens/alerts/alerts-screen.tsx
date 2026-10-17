import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const AlertsScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.alerts')} />;
};

export default AlertsScreen;
