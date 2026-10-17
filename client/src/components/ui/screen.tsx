import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  /** Drawn above the scrolling content, e.g. a ScreenHeader */
  header?: ReactNode;
  children: ReactNode;
  /** Pinned to the bottom, e.g. the main button */
  footer?: ReactNode;
  background?: string;
  /** Tab screens leave the bottom edge to the tab bar */
  inTabs?: boolean;
  /** Content goes edge to edge, e.g. a coloured hero header */
  noPadding?: boolean;
  contentStyle?: ViewStyle;
};

// Safe area, scrolling content and an optional pinned footer, as on the mockup screens.
const Screen = ({
  header,
  children,
  footer,
  background = colors.background,
  inTabs = false,
  noPadding = false,
  contentStyle,
}: ScreenProps) => (
  <SafeAreaView
    style={[styles.safeArea, { backgroundColor: background }]}
    edges={inTabs || footer ? ['top'] : ['top', 'bottom']}
  >
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[noPadding ? styles.noPadding : styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer && (
        <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: background }]}>
          {footer}
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
  </SafeAreaView>
);

export default Screen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: 14 },
  noPadding: { paddingBottom: spacing.xxxl },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
});

/** Side padding for content inside a `noPadding` screen */
export const ScreenSection = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[sectionStyles.section, style]}>{children}</View>
);

const sectionStyles = StyleSheet.create({
  section: { paddingHorizontal: spacing.xl, gap: spacing.md },
});
