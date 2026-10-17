import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import IconTile from '@/components/ui/icon-tile';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Note from '@/components/ui/note';
import Screen from '@/components/ui/screen';
import { colors, spacing } from '@/theme';
import { callNumber, formatPhone } from '@/utils/links';

// Placeholder contact details until the insurer's real ones are known.
const supportPhone = '+358800123456';
const supportEmail = 'support@tassuvahti.fi';

const SupportScreen = () => {
  const { t } = useTranslation();

  return (
    <Screen header={<ScreenHeader title={t('profile.support')} />}>
      <AppText variant="body" color={colors.textSecondary}>
        {t('profile.supportIntro')}
      </AppText>
      <ListGroup>
        <ListRow
          leading={<IconTile name="phone" />}
          title={t('profile.phone')}
          subtitle={formatPhone(supportPhone)}
          onPress={() => callNumber(supportPhone)}
        />
        <ListRow
          leading={<IconTile name="send" />}
          title={t('profile.email')}
          subtitle={supportEmail}
          onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
        />
        <ListRow leading={<IconTile name="clock" />} title={t('profile.hours')} subtitle={t('profile.hoursValue')} />
      </ListGroup>
      <Button label={t('profile.call')} icon="phone" onPress={() => callNumber(supportPhone)} style={styles.button} />
      <Button
        label={t('profile.sendEmail')}
        icon="send"
        variant="outline"
        onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
      />
      <Note tone="red" icon="alertTriangle">
        {t('profile.emergencyNote')}
      </Note>
      <Button
        label={t('explore.sections.vets')}
        icon="map"
        variant="dangerOutline"
        onPress={() => router.push('/explore?mode=emergency')}
      />
    </Screen>
  );
};

export default SupportScreen;

const styles = StyleSheet.create({
  button: { marginTop: spacing.sm },
});
