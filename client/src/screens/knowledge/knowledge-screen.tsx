import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';

const KnowledgeScreen = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('screens.knowledge')}
      links={[
        { label: t('screens.substance'), href: '/substance/lily' },
        { label: t('screens.ateThis'), href: '/ate-this' },
      ]}
    />
  );
};

export default KnowledgeScreen;
