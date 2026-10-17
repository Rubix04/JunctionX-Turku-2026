import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { type ColorValue, StyleSheet, View } from 'react-native';

import Icon, { type IconName } from '@/components/ui/icon';
import { colors, radius, typography } from '@/theme';

// The selected tab gets a sand pill behind its icon, so the highlight never gets cut off by the tab bar.
const tabIcon =
  (name: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <View style={[styles.pill, focused && styles.pillOn]}>
      <Icon name={name} color={color} />
    </View>
  );

// Home is the only index route now, so "/" always opens it; this also makes it the first tab in history.
export const unstable_settings = { initialRouteName: '(home)' };

const TabLayout = () => {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: typography.tabLabel,
        tabBarIconStyle: styles.icon,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="pets" options={{ title: t('tabs.pets'), tabBarIcon: tabIcon('paw') }} />
      <Tabs.Screen name="explore" options={{ title: t('tabs.explore'), tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
};

export default TabLayout;

const styles = StyleSheet.create({
  icon: { width: 56 },
  pill: { width: 56, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.accentTint },
});
