import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';
import { useAuth } from '@/context/auth-context';

const UnlockScreen = () => {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  return (
    <PlaceholderScreen
      title={t('screens.unlock')}
      action={{ label: t('auth.signInDemo'), onPress: signIn }}
    />
  );
};

export default UnlockScreen;
