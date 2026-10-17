import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const AddPetScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.addPet')} />;
};

export default AddPetScreen;
