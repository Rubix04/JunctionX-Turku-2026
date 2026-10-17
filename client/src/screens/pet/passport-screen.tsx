import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const PassportScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();

  return (
    <PlaceholderScreen
      title={t('screens.passport')}
      links={[
        { label: t('screens.sharePassport'), href: `/pet/${petId}/share-passport` },
      ]}
    />
  );
};

export default PassportScreen;
