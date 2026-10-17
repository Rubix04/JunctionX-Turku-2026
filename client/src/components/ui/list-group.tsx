import { type Href, router } from 'expo-router';
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, fonts, radius, spacing } from '@/theme';

// White card holding rows separated by thin lines, as in the mockups' lists.
export const ListGroup = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
};

type ListRowProps = {
  title: string;
  subtitle?: string | null;
  /** Shown on the left, e.g. an icon tile or a date */
  leading?: ReactNode;
  /** Shown on the right, e.g. a status pill or a button */
  trailing?: ReactNode;
  href?: Href;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export const ListRow = ({ title, subtitle, leading, trailing, href, onPress, accessibilityLabel }: ListRowProps) => {
  const pressable = Boolean(href || onPress);
  const content = (
    <>
      {leading}
      <View style={styles.texts}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {pressable && !trailing && <Icon name="chevronRight" size={18} color={colors.muted} />}
    </>
  );

  if (!pressable) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress ?? (() => href && router.push(href))}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
};

/** Day and month stacked, e.g. "13 / OCT" on visit rows */
export const DateTile = ({ day, month, tint }: { day: string; month: string; tint?: string }) => (
  <View style={[styles.date, tint ? { backgroundColor: tint, borderRadius: radius.sm, height: 48 } : null]}>
    <AppText variant="title" style={styles.dateDay}>
      {day}
    </AppText>
    <AppText variant="caption" color={tint ? colors.accentText : colors.muted} style={styles.dateMonth}>
      {month}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.divider },
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.background },
  texts: { flex: 1, gap: 1 },
  date: { width: 48, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 20 },
  dateMonth: { fontSize: 11.5, fontFamily: fonts.bodyBold },
});
