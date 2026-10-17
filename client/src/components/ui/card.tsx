import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius } from '@/theme';

// White card with a border, used for most content blocks in the mockups.
const Card = ({ style, ...props }: ViewProps) => <View style={[styles.card, style]} {...props} />;

export default Card;

const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
