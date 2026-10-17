import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const DailyLogScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();

  return (
    <PlaceholderScreen
      title={t('screens.log')}
      links={[
        { label: t('screens.logResult'), href: `/pet/${petId}/log-result` },
      ]}
    />
  );
};

export default DailyLogScreen;
