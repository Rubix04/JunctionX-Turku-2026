import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import SegmentedControl from '@/components/ui/segmented-control';
import Screen from '@/components/ui/screen';
import KnowledgeSection from '@/screens/explore/knowledge-section';
import MapSection from '@/screens/explore/map-section';
import QuizzesSection from '@/screens/explore/quizzes-section';
import { colors, spacing } from '@/theme';

const sections = ['vets', 'safe', 'quizzes'] as const;
type Section = (typeof sections)[number];

// Vets on a map, the "Is it safe?" knowledge base and quizzes. ?mode=emergency opens the vets.
const ExploreScreen = () => {
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [section, setSection] = useState<Section>('vets');
  const [appliedMode, setAppliedMode] = useState(mode);

  if (mode !== appliedMode) {
    setAppliedMode(mode);
    if (mode === 'emergency') setSection('vets');
  }

  const header = (
    <View style={styles.header}>
      <AppText variant="h1" accessibilityRole="header">
        {t('explore.title')}
      </AppText>
      <SegmentedControl
        label={t('explore.title')}
        options={sections.map((value) => ({ value, label: t(`explore.sections.${value}`) }))}
        value={section}
        onChange={setSection}
      />
    </View>
  );

  return (
    <Screen inTabs header={header} noPadding contentStyle={styles.content} background={colors.background}>
      {section === 'vets' && <MapSection />}
      {section === 'safe' && <KnowledgeSection />}
      {section === 'quizzes' && <QuizzesSection />}
    </Screen>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  content: { gap: spacing.md },
});
