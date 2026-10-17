import '@/i18n';

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold, useFonts } from '@expo-google-fonts/sora';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { stackScreenOptions } from '@/constants/navigation';
import { AuthProvider, useAuth } from '@/context/auth-context';

// Keep the splash screen up until the fonts are ready.
SplashScreen.preventAutoHideAsync();

const RootNavigator = () => {
  const { isSignedIn } = useAuth();

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pet/[petId]" />
        <Stack.Screen name="clinic/[id]" />
        <Stack.Screen name="substance/[id]" />
        <Stack.Screen name="find-in-store" />
        <Stack.Screen name="ate-this" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-pet" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-visit" options={{ presentation: 'fullScreenModal' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Emergency mode must open without signing in. Keep it outside both guards. */}
      <Stack.Screen name="emergency" />
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

  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

export default RootLayout;
