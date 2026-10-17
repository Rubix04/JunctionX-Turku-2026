import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Pill from '@/components/ui/pill';
import { colors, radius, spacing } from '@/theme';
import type { Clinic } from '@/types/clinic';
import { formatNumber } from '@/utils/format';
import { callNumber, openDirections } from '@/utils/links';
import { isOpenNow } from '@/utils/opening-hours';

type ClinicCardProps = {
  clinic: Clinic;
  /** Big red Call button, for emergencies */
  emergency?: boolean;
  /** Opens the clinic card. Off in emergency mode before sign-in. */
  linkToDetails?: boolean;
};

// Clinic summary with Call and Directions, used on the red result, emergency mode and the map.
const ClinicCard = ({ clinic, emergency = false, linkToDetails = true }: ClinicCardProps) => {
  const { t } = useTranslation();
  const open = isOpenNow(clinic);
  const facts = [
    clinic.emergency24h ? t('clinic.emergency24h') : null,
    t('clinic.distance', { km: formatNumber(clinic.distanceKm) }),
    t('clinic.drive', { minutes: clinic.driveMinutes }),
  ].filter(Boolean);

  const header = (
    <View style={styles.top}>
      <View style={styles.titles}>
        <AppText variant="title">{clinic.name}</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary}>
          {facts.join(' · ')}
        </AppText>
      </View>
      <Pill label={open ? t('clinic.openNow') : t('clinic.closed')} tone={open ? 'green' : 'neutral'} />
    </View>
  );

  return (
    <View style={styles.card}>
      {linkToDetails ? (
        <Pressable
          accessibilityRole="link"
          accessibilityHint={t('clinic.openCardHint')}
          onPress={() => router.push(`/clinic/${clinic.id}`)}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}
      {(clinic.contracted || clinic.directPayment) && (
        <View style={styles.tags}>
          {clinic.contracted && <Pill label={t('clinic.contracted')} icon="shieldCheck" />}
          {clinic.directPayment && <Pill label={t('clinic.directPayment')} />}
        </View>
      )}
      <View style={styles.actions}>
        <Button
          label={t('clinic.call')}
          icon="phone"
          variant={emergency ? 'danger' : 'primary'}
          size={emergency ? 'large' : 'medium'}
          onPress={() => callNumber(clinic.phone)}
          accessibilityHint={t('clinic.callHint', { name: clinic.name })}
          style={styles.action}
        />
        <Button
          label={t('clinic.directions')}
          icon="directions"
          variant="outline"
          size={emergency ? 'large' : 'medium'}
          onPress={() => openDirections(clinic.address)}
          style={styles.action}
        />
      </View>
    </View>
  );
};

export default ClinicCard;

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  titles: { flex: 1, gap: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, borderRadius: radius.md },
});
