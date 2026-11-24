import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import Screen from '@/components/ui/screen';
import KnowledgeSection from '@/screens/safe/knowledge-section';
import { colors, spacing } from '@/theme';

// "Is it safe?" knowledge base (spec 10), opened from the home screen.
const SafeScreen = () => {
  const { t } = useTranslation();

  return (
    <Screen
      header={<ScreenHeader title={t('explore.sections.safe')} />}
      noPadding
      contentStyle={styles.content}
      background={colors.background}
    >
      <KnowledgeSection />
    </Screen>
  );
};

export default SafeScreen;

const styles = StyleSheet.create({
  content: { gap: spacing.md },
});
