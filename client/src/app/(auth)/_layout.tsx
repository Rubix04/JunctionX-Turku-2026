import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';
import { useAuth } from '@/context/auth-context';

// First time: welcome → bank sign-in → set lock. Returning user: unlock only.
const AuthLayout = () => {
  const { status } = useAuth();

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="bank-auth" />
        <Stack.Screen name="set-lock" />
      </Stack.Protected>

      <Stack.Protected guard={status === 'locked'}>
        <Stack.Screen name="unlock" />
      </Stack.Protected>
    </Stack>
  );
};

export default AuthLayout;
