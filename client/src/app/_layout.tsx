import { restoreLanguage } from '@/i18n';

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold, useFonts } from '@expo-google-fonts/sora';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { stackScreenOptions } from '@/constants/navigation';
import { AuthProvider, useAuth } from '@/context/auth-context';

// Keep the splash screen up until fonts, language and the saved session are ready.
SplashScreen.preventAutoHideAsync();

const RootNavigator = () => {
  const { status } = useAuth();
  const isSignedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'loading') {
    return null;
  }

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pet/[petId]" />
        <Stack.Screen name="clinic/[id]" />
        <Stack.Screen name="substance/[id]" />
        <Stack.Screen name="quiz/[id]" />
        <Stack.Screen name="find-in-store" />
        <Stack.Screen name="ate-this" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-pet" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-visit" options={{ presentation: 'fullScreenModal' }} />
      </Stack.Protected>

      {/* BankID and email sign-in / sign-up. */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
};

const RootLayout = () => {
  // Keys must match the font names in theme/typography.ts.
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    restoreLanguage().finally(() => setLanguageReady(true));
  }, []);

  if (!(fontsLoaded || fontError) || !languageReady) {
    return null;
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

export default RootLayout;
