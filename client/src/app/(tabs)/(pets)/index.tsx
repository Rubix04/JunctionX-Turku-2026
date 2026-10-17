import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

// Rebuilt in step 3: pet list, pet details and add pet.
const PetsTab = () => {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('tabs.pets')} />;
};

export default PetsTab;
