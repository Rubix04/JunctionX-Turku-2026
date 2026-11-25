import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import VetServiceCard from '@/components/features/vet-service-card';
import AppText from '@/components/ui/app-text';
import SectionLabel from '@/components/ui/section-label';
import Screen, { ScreenSection } from '@/components/ui/screen';
import { useAsync } from '@/hooks/use-async';
import MapSection from '@/screens/explore/map-section';
import { getVetServices } from '@/services/vet-services';
import { colors, spacing } from '@/theme';

// Remote vet services first, then vets on a map. The knowledge base is on its own screen (/safe).
const ExploreScreen = () => {
  const { t } = useTranslation();
  const { data: services } = useAsync(getVetServices, []);
  // Coming from a reminder's Book button: the clinics come first, the remote services after them.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const clinicsFirst = mode === 'book';

  const header = (
    <View style={styles.header}>
      <AppText variant="h1" accessibilityRole="header">
        {t('explore.title')}
      </AppText>
    </View>
  );

  return (
    <Screen inTabs header={header} noPadding contentStyle={styles.content} background={colors.background}>
      {clinicsFirst && <MapSection />}
      {services && services.length > 0 && (
        <ScreenSection>
          <SectionLabel label={t('home.vetServices')} />
          {services.map((service) => (
            <VetServiceCard key={service.id} service={service} />
          ))}
        </ScreenSection>
      )}
      {!clinicsFirst && <MapSection />}
    </Screen>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  content: { gap: spacing.md },
});
