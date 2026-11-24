import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Screen from '@/components/ui/screen';
import MapSection from '@/screens/explore/map-section';
import { colors, spacing } from '@/theme';

// Vets on a map. The knowledge base moved to its own screen (/safe), opened from home.
const ExploreScreen = () => {
  const { t } = useTranslation();

  const header = (
    <View style={styles.header}>
      <AppText variant="h1" accessibilityRole="header">
        {t('explore.title')}
      </AppText>
    </View>
  );

  return (
    <Screen inTabs header={header} noPadding contentStyle={styles.content} background={colors.background}>
      <MapSection />
    </Screen>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  content: { gap: spacing.md },
});
