import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const LogResultScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.logResult')} />;
};

export default LogResultScreen;
