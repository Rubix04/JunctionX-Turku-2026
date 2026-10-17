import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const PetScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();

  return (
    <PlaceholderScreen
      title={t('screens.pet')}
      links={[
        { label: t('screens.log'), href: `/pet/${petId}/log` },
        { label: t('screens.trends'), href: `/pet/${petId}/trends` },
        { label: t('screens.carePlan'), href: `/pet/${petId}/care-plan` },
        { label: t('screens.reminders'), href: `/pet/${petId}/reminders` },
        { label: t('screens.diet'), href: `/pet/${petId}/diet` },
        { label: t('screens.passport'), href: `/pet/${petId}/passport` },
        { label: t('screens.photo'), href: `/pet/${petId}/photo` },
      ]}
    />
  );
};

export default PetScreen;
