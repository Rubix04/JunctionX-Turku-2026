import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import ScreenHeader from '@/components/features/screen-header';
import Button from '@/components/ui/button';
import Screen from '@/components/ui/screen';
import { EmptyView } from '@/components/ui/state-views';

const NotFoundScreen = () => {
  const { t } = useTranslation();

  return (
    <Screen header={<ScreenHeader title={t('screens.notFound')} />}>
      <EmptyView title={t('notFound.title')} body={t('notFound.body')} />
      <Button label={t('screens.home')} onPress={() => router.replace('/')} />
    </Screen>
  );
};

export default NotFoundScreen;
