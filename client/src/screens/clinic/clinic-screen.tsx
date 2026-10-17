import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import ClinicCard from '@/components/features/clinic-card';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import Note from '@/components/ui/note';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/state-views';
import { useAsync } from '@/hooks/use-async';
import { getClinic } from '@/services/clinics';
import { colors, fonts, spacing } from '@/theme';
import { formatPhone } from '@/utils/links';

const weekdayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

// Clinic card: hours, phone, booking, directions and direct payment (spec 7).
const ClinicScreen = () => {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: clinic, error, reload } = useAsync(() => getClinic(id), [id]);

  const header = <ScreenHeader title={clinic?.name ?? t('screens.clinic')} />;
  if (!clinic) {
    return <Screen header={header}>{error ? <ErrorView onRetry={reload} /> : <LoadingView />}</Screen>;
  }

  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <Screen header={header}>
      <ClinicCard clinic={clinic} emergency={clinic.emergency24h} linkToDetails={false} />

      {clinic.bookingUrl && (
        <Button
          label={t('clinic.book')}
          icon="calendar"
          variant="tealOutline"
          onPress={() => WebBrowser.openBrowserAsync(clinic.bookingUrl!)}
        />
      )}

      <Note icon={clinic.directPayment ? 'shieldCheck' : 'receipt'}>
        {clinic.directPayment ? t('clinic.directPaymentNote') : t('clinic.noDirectPaymentNote')}
      </Note>

      <SectionLabel label={t('clinic.hours')} />
      <ListGroup>
        {clinic.emergency24h ? (
          <ListRow title={t('clinic.open24h')} subtitle={t('clinic.open24hBody')} />
        ) : (
          weekdayKeys.map((day, index) => {
            const hours = clinic.hours[index];
            return (
              <View key={day} style={[styles.hoursRow, index === todayIndex && styles.today]}>
                <AppText style={[styles.flex, index === todayIndex && styles.bold]}>{t(`weekday.${day}`)}</AppText>
                <AppText color={hours ? colors.text : colors.muted} style={index === todayIndex && styles.bold}>
                  {hours ? `${hours.open}–${hours.close}` : t('clinic.closed')}
                </AppText>
              </View>
            );
          })
        )}
      </ListGroup>

      <SectionLabel label={t('clinic.details')} />
      <ListGroup>
        <ListRow title={t('clinic.address')} subtitle={clinic.address} />
        <ListRow title={t('clinic.phone')} subtitle={formatPhone(clinic.phone)} />
        <ListRow
          title={t('clinic.species')}
          subtitle={clinic.species.map((s) => t(`species.${s}Plural`)).join(', ')}
        />
        {clinic.expertise.length > 0 && <ListRow title={t('clinic.expertise')} subtitle={clinic.expertise.join(', ')} />}
      </ListGroup>
      {!clinic.contracted && (
        <AppText variant="caption" color={colors.muted} style={styles.center}>
          {t('clinic.notContracted')}
        </AppText>
      )}
    </Screen>
  );
};

export default ClinicScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  center: { textAlign: 'center' },
  hoursRow: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  today: { backgroundColor: colors.primaryTint },
  gap: { gap: spacing.sm },
});
