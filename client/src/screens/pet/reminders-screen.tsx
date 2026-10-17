import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const RemindersScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.reminders')} />;
};

export default RemindersScreen;
