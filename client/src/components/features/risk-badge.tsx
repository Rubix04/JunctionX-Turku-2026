import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { colors, fonts, radius, spacing } from '@/theme';
import type { RiskOrUnknown } from '@/types/knowledge';

// Knowledge base risk levels. Like the traffic light, colour always comes with an icon and a word.
const levels: Record<RiskOrUnknown, { background: string; text: string; icon: IconName }> = {
  harmless: { background: colors.greenTint, text: colors.greenText, icon: 'check' },
  caution: { background: colors.yellow, text: colors.text, icon: 'alertCircle' },
  dangerous: { background: colors.redTint, text: colors.redText, icon: 'alertTriangle' },
  emergency: { background: colors.red, text: colors.onDark, icon: 'emergency' },
  unknown: { background: colors.segmentBackground, text: colors.textSecondary, icon: 'info' },
};

type RiskBadgeProps = { level: RiskOrUnknown; prefix?: string; large?: boolean };

const RiskBadge = ({ level, prefix, large = false }: RiskBadgeProps) => {
  const { t } = useTranslation();
  const { background, text, icon } = levels[level];
  const label = t(`risk.${level}`);

  return (
    <View style={[styles.badge, large && styles.large, { backgroundColor: background }]}>
      <Icon name={icon} size={large ? 16 : 13} color={text} strokeWidth={2.5} />
      <AppText variant="caption" color={text} style={[styles.label, large && styles.largeLabel]}>
        {prefix ? `${prefix} · ${label}` : label}
      </AppText>
    </View>
  );
};

export default RiskBadge;

const styles = StyleSheet.create({
  badge: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  large: { minHeight: 34, paddingHorizontal: 14 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  largeLabel: { fontSize: 14 },
});
