import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const FirstAidGuideScreen = () => {
  const { t } = useTranslation();

  return <PlaceholderScreen title={t('screens.firstAidGuide')} />;
};

export default FirstAidGuideScreen;
