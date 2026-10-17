import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import IconTile from '@/components/ui/icon-tile';
import Pill from '@/components/ui/pill';
import { ScreenSection } from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getBestScore, getQuizzes } from '@/services/quizzes';
import { colors, radius, spacing } from '@/theme';
import { localize } from '@/utils/format';

// Short lessons with scenario questions; the best score shows on each card.
const QuizzesSection = () => {
  const { t } = useTranslation();
  const { data: quizzes, error, reload } = useAsync(getQuizzes, []);
  useReloadOnFocus(reload);

  if (!quizzes) {
    return <ScreenSection>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</ScreenSection>;
  }

  return (
    <ScreenSection>
      <AppText variant="bodySmall" color={colors.textSecondary}>
        {t('quiz.intro')}
      </AppText>
      {quizzes.map((quiz) => {
        const best = getBestScore(quiz.id);
        const total = quiz.questions.length;
        return (
          <Pressable
            key={quiz.id}
            accessibilityRole="link"
            onPress={() => router.push(`/quiz/${quiz.id}`)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <IconTile name={quiz.icon} tone="amber" size={48} />
            <View style={styles.texts}>
              <AppText variant="label">{localize(quiz.title)}</AppText>
              <AppText variant="caption" color={colors.muted}>
                {localize(quiz.summary)}
              </AppText>
              <View style={styles.pills}>
                <Pill label={t('quiz.questions', { count: total })} tone="neutral" />
                {best !== null && (
                  <Pill
                    label={t('quiz.best', { score: best, total })}
                    tone={best === total ? 'green' : 'amber'}
                    icon={best === total ? 'check' : undefined}
                  />
                )}
              </View>
            </View>
            <Icon name="chevronRight" size={20} color={colors.muted} />
          </Pressable>
        );
      })}
    </ScreenSection>
  );
};

export default QuizzesSection;

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: { flex: 1, gap: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  pressed: { opacity: 0.7 },
});
