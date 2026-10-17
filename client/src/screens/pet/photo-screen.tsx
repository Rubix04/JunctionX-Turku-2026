import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const PhotoScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.photo')} />;
};

export default PhotoScreen;
