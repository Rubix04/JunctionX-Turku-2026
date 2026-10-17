import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import AppText from '@/components/ui/app-text';
import { colors } from '@/theme';

type DisclaimerProps = {
  /** Which wording: the app in general, a log result, or first aid */
  kind?: 'app' | 'result' | 'firstAid' | 'knowledge';
  color?: string;
};

// The "does not replace a vet" note. Must stay visible where the design has it.
const Disclaimer = ({ kind = 'app', color = colors.muted }: DisclaimerProps) => {
  const { t } = useTranslation();
  return (
    <AppText variant="caption" color={color} style={styles.text}>
      {t(`disclaimer.${kind}`)}
    </AppText>
  );
};

export default Disclaimer;

const styles = StyleSheet.create({
  text: { textAlign: 'center', lineHeight: 18, fontSize: 12.5 },
});
