import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';
import { useAuth } from '@/context/auth-context';

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  return (
    <PlaceholderScreen
      title={t('screens.settings')}
      links={[
        { label: t('screens.insurance'), href: '/insurance' },
      ]}
      action={{ label: t('auth.signOut'), onPress: signOut }}
    />
  );
};

export default SettingsScreen;
