import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

// Text with the app's fonts. Use this instead of plain <Text> in screens.
const AppText = ({ variant = 'body', color = colors.text, style, ...props }: AppTextProps) => (
  <Text style={[typography[variant], { color }, style]} {...props} />
);

export default AppText;
