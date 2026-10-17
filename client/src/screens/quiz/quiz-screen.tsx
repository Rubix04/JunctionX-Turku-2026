import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import IconTile from '@/components/ui/icon-tile';
import Screen from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getQuiz, saveQuizResult } from '@/services/quizzes';
import { colors, radius, spacing } from '@/theme';
import type { QuizQuestion } from '@/types/quiz';
import { localize } from '@/utils/format';

/** Lesson first, then one question at a time, then the score */
type Step = 'lesson' | number | 'done';

const optionStyle = (index: number, question: QuizQuestion, chosen: number | null) => {
  if (chosen === null) return null;
  if (index === question.answer) return styles.optionRight;
  if (index === chosen) return styles.optionWrong;
  return styles.optionFaded;
};

const QuestionView = ({
  question,
  chosen,
  onChoose,
}: {
  question: QuizQuestion;
  chosen: number | null;
  onChoose: (index: number) => void;
}) => {
  const { t } = useTranslation();
  const answered = chosen !== null;
  const right = chosen === question.answer;

  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        {localize(question.prompt)}
      </AppText>
      <View style={styles.options}>
        {question.options.map((option, index) => {
          const isAnswer = answered && index === question.answer;
          const isWrongChoice = answered && index === chosen && !right;
          return (
            <Pressable
              key={index}
              accessibilityRole="radio"
              accessibilityState={{ checked: index === chosen, disabled: answered }}
              disabled={answered}
              onPress={() => onChoose(index)}
              style={({ pressed }) => [styles.option, optionStyle(index, question, chosen), pressed && styles.pressed]}
            >
              <AppText variant="body" style={styles.flex}>
                {localize(option)}
              </AppText>
              {isAnswer && <Icon name="check" size={20} color={colors.greenText} />}
              {isWrongChoice && <Icon name="close" size={20} color={colors.redText} />}
            </Pressable>
          );
        })}
      </View>
      {answered && (
        <View style={[styles.feedback, right ? styles.feedbackRight : styles.feedbackWrong]}>
          <AppText variant="label" color={right ? colors.greenText : colors.redText}>
            {t(right ? 'quiz.correct' : 'quiz.notQuite')}
          </AppText>
          <AppText variant="bodySmall" color={colors.text}>
            {localize(question.explanation)}
          </AppText>
        </View>
      )}
    </>
  );
};

// A short lesson followed by scenario questions with instant feedback.
const QuizScreen = () => {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quiz, error, reload } = useAsync(() => getQuiz(id), [id]);
  const [step, setStep] = useState<Step>('lesson');
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  if (!quiz) {
    return (
      <Screen header={<ScreenHeader />}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>
    );
  }

  const total = quiz.questions.length;
  const score = quiz.questions.filter((q, i) => answers[i] === q.answer).length;
  const header = <ScreenHeader title={localize(quiz.title)} />;

  const start = () => {
    setAnswers(quiz.questions.map(() => null));
    setStep(0);
  };

  if (step === 'lesson') {
    return (
      <Screen
        header={header}
        footer={<Button label={t('quiz.start', { count: total })} size="large" onPress={start} />}
      >
        <Card>
          <IconTile name={quiz.icon} tone="amber" size={48} />
          <AppText variant="title">{t('quiz.beforeYouStart')}</AppText>
          {quiz.lesson.map((point, index) => (
            <View key={index} style={styles.point}>
              <View style={styles.bullet} />
              <AppText variant="body" color={colors.textSecondary} style={styles.flex}>
                {localize(point)}
              </AppText>
            </View>
          ))}
        </Card>
      </Screen>
    );
  }

  if (step === 'done') {
    const perfect = score === total;
    return (
      <Screen
        header={header}
        footer={
          <View style={styles.footerButtons}>
            <Button label={t('quiz.tryAgain')} variant="outline" onPress={start} />
            <Button label={t('quiz.backToExplore')} onPress={() => router.back()} />
          </View>
        }
      >
        <Card style={styles.result}>
          <IconTile name={perfect ? 'star' : 'heart'} tone={perfect ? 'amber' : 'teal'} size={64} />
          <AppText variant="h1">{t('quiz.score', { score, total })}</AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.center}>
            {t(perfect ? 'quiz.perfect' : 'quiz.goodTry')}
          </AppText>
        </Card>
        {quiz.substanceId && (
          <Button
            label={t('quiz.readMore')}
            icon="book"
            variant="tealOutline"
            onPress={() => router.push(`/substance/${quiz.substanceId}`)}
          />
        )}
      </Screen>
    );
  }

  const question = quiz.questions[step];
  const chosen = answers[step] ?? null;
  const last = step === total - 1;

  const next = () => {
    if (last) {
      saveQuizResult(quiz.id, score);
      setStep('done');
    } else {
      setStep(step + 1);
    }
  };

  return (
    <Screen
      header={header}
      footer={
        chosen !== null ? (
          <Button label={t(last ? 'quiz.seeResult' : 'quiz.next')} size="large" onPress={next} />
        ) : undefined
      }
    >
      <View style={styles.progressTexts}>
        <AppText variant="caption" color={colors.muted}>
          {t('quiz.questionOf', { current: step + 1, total })}
        </AppText>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((step + 1) / total) * 100}%` }]} />
        </View>
      </View>
      <QuestionView
        question={question}
        chosen={chosen}
        onChoose={(index) => setAnswers(answers.map((a, i) => (i === step ? index : a)))}
      />
    </Screen>
  );
};

export default QuizScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 8, backgroundColor: colors.accent },
  progressTexts: { gap: spacing.sm },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.primaryTint, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  options: { gap: 10 },
  option: {
    minHeight: 56,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionRight: { borderColor: colors.green, backgroundColor: colors.greenTint },
  optionWrong: { borderColor: colors.red, backgroundColor: colors.redTint },
  optionFaded: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  feedback: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.xs, borderWidth: 1 },
  feedbackRight: { backgroundColor: colors.greenTint, borderColor: colors.green },
  feedbackWrong: { backgroundColor: colors.redTint, borderColor: colors.redBorder },
  result: { alignItems: 'center' },
  footerButtons: { gap: spacing.sm },
});
