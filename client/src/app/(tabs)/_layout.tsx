import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import Icon, { type IconName } from '@/components/ui/icon';
import { colors, typography } from '@/theme';

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
        tabBarLabelStyle: typography.tabLabel,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="(map)" options={{ title: t('tabs.map'), tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen
        name="(knowledge)"
        options={{ title: t('tabs.knowledge'), tabBarIcon: tabIcon('book') }}
      />
      <Tabs.Screen
        name="(alerts)"
        options={{ title: t('tabs.alerts'), tabBarIcon: tabIcon('bell') }}
      />
      <Tabs.Screen
        name="(account)"
        options={{ title: t('tabs.account'), tabBarIcon: tabIcon('user') }}
      />
    </Tabs>
  );
};

export default TabLayout;
