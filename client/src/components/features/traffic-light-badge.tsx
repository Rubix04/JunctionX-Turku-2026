import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { colors, fonts, radius, spacing } from '@/theme';
import type { TrafficLightLevel } from '@/types/health';

// Every level pairs a color with an icon and a word, so it reads without color vision.
const levels: Record<TrafficLightLevel, { background: string; text: string; icon: IconName }> = {
  green: { background: colors.green, text: colors.onDark, icon: 'check' },
  yellow: { background: colors.yellow, text: colors.text, icon: 'alertCircle' },
  red: { background: colors.red, text: colors.onDark, icon: 'alertTriangle' },
};

const TrafficLightBadge = ({ level }: { level: TrafficLightLevel }) => {
  const { t } = useTranslation();
  const { background, text, icon } = levels[level];

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Icon name={icon} size={14} color={text} strokeWidth={2.6} />
      <AppText variant="caption" color={text} style={styles.label}>
        {t(`trafficLight.${level}`)}
      </AppText>
    </View>
  );
};

export default TrafficLightBadge;

const styles = StyleSheet.create({
  badge: {
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
  },
  label: { fontFamily: fonts.bodyBold },
});
