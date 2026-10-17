import { useTranslation } from 'react-i18next';

import PlaceholderScreen from '@/components/ui/placeholder-screen';
import { useAuth } from '@/context/auth-context';

// Temporary entry point. Step 1 replaces it with the video landing page,
// BankID and email sign-in / sign-up.
const AuthIndex = () => {
  const { t } = useTranslation();
  const { signInWithBank } = useAuth();

  return (
    <PlaceholderScreen
      title={t('auth.title')}
      action={{ label: t('auth.continueWithBankId'), onPress: () => signInWithBank('op') }}
    />
  );
};

export default AuthIndex;
