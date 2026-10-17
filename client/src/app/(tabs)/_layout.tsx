import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { colors, typography } from '@/theme';

// Tab icons come with the shared UI components.
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
      <Tabs.Screen name="(home)" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="(map)" options={{ title: t('tabs.map') }} />
      <Tabs.Screen name="(knowledge)" options={{ title: t('tabs.knowledge') }} />
      <Tabs.Screen name="(alerts)" options={{ title: t('tabs.alerts') }} />
      <Tabs.Screen name="(account)" options={{ title: t('tabs.account') }} />
    </Tabs>
  );
};

export default TabLayout;
