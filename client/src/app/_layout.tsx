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
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppLogo from '@/components/features/app-logo';
import { stackScreenOptions } from '@/constants/navigation';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { colors } from '@/theme';

// The native splash hands over to LoadingScreen, which stays up for at least this long.
SplashScreen.preventAutoHideAsync();
const minSplashMs = 3000;

/** Same look as the native splash: blue with the logo */
const LoadingScreen = () => {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.loading}>
      <AppLogo size={120} variant="light" />
      <ActivityIndicator color={colors.onDark} />
    </View>
  );
};

const RootNavigator = ({ ready }: { ready: boolean }) => {
  const { status } = useAuth();
  const isSignedIn = status === 'signedIn';

  if (!ready || status === 'loading') {
    return <LoadingScreen />;
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
  const [splashTimeUp, setSplashTimeUp] = useState(false);

  useEffect(() => {
    restoreLanguage().finally(() => setLanguageReady(true));
    const timer = setTimeout(() => setSplashTimeUp(true), minSplashMs);
    return () => clearTimeout(timer);
  }, []);

  if (!(fontsLoaded || fontError)) {
    return <LoadingScreen />;
  }

  // The saved session loads while the logo is showing.
  return (
    <AuthProvider>
      <RootNavigator ready={languageReady && splashTimeUp} />
    </AuthProvider>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, backgroundColor: colors.primary },
});
