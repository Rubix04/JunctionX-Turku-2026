import type { NativeStackNavigationOptions } from 'expo-router';

import { colors } from '@/theme';

// Shared options for every Stack. Screens draw their own headers, as in the mockups.
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
};
