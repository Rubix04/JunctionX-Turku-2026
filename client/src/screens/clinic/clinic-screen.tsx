import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const ClinicScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.clinic')} />;
};

export default ClinicScreen;
