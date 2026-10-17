import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';
import { useAuth } from '@/context/auth-context';

const SetLockScreen = () => {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  return (
    <PlaceholderScreen
      title={t('screens.setLock')}
      action={{ label: t('auth.signInDemo'), onPress: signIn }}
    />
  );
};

export default SetLockScreen;
