import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { colors, radius, spacing } from '@/theme';

type NoteProps = {
  icon?: IconName;
  tone?: 'teal' | 'amber' | 'red';
  children: ReactNode;
  /** e.g. a "Link" button */
  trailing?: ReactNode;
};

const tones = {
  teal: { background: colors.primaryTint, border: colors.primaryTint, icon: colors.primary, text: colors.noteText },
  amber: { background: colors.accentTint, border: colors.accentBorder, icon: colors.accentDark, text: colors.accentBody },
  red: { background: colors.redTint, border: colors.redBorder, icon: colors.redText, text: colors.redText },
};

// Tinted box with an icon for tips and notices.
const Note = ({ icon = 'info', tone = 'teal', children, trailing }: NoteProps) => (
  <View style={[styles.note, { backgroundColor: tones[tone].background, borderColor: tones[tone].border }]}>
    <Icon name={icon} size={20} color={tones[tone].icon} />
    <AppText variant="bodySmall" color={tones[tone].text} style={styles.text}>
      {children}
    </AppText>
    {trailing}
  </View>
);

export default Note;

const styles = StyleSheet.create({
  note: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  text: { flex: 1 },
});
