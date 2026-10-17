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

import { colors } from '@/theme';

// Keep the splash screen up until the fonts are ready.
SplashScreen.preventAutoHideAsync();

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

  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }} />;
};

export default RootLayout;
