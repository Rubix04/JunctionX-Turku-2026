import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import Icon, { type IconName } from '@/components/ui/icon';
import { colors, radius, spacing, typography } from '@/theme';

const tabIcon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => <Icon name={name} color={color} />;

const TabLayout = () => {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.accentTint,
        tabBarItemStyle: { margin: spacing.xs, borderRadius: radius.md },
        tabBarLabelStyle: typography.tabLabel,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="(pets)" options={{ title: t('tabs.pets'), tabBarIcon: tabIcon('paw') }} />
      <Tabs.Screen
        name="(explore)"
        options={{ title: t('tabs.explore'), tabBarIcon: tabIcon('map') }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('user') }}
      />
    </Tabs>
  );
};

export default TabLayout;
