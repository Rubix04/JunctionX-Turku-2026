import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { colors, radius, spacing } from '@/theme';
import type { VetService } from '@/types/vet-service';
import { formatDayMonth, formatEuros, formatTime, localize, todayIso } from '@/utils/format';

// A remote vet service (advice call, prescription call) with its next free time and a booking button.
const VetServiceCard = ({ service }: { service: VetService }) => {
  const { t } = useTranslation();
  const [booked, setBooked] = useState(false);
  const { availability } = service;

  let when: string;
  if (availability.kind === 'queue') {
    when = t('home.approxMinutes', { minutes: availability.minutes });
  } else {
    const time = formatTime(availability.at);
    when = availability.at.startsWith(todayIso())
      ? t('home.todayAt', { time })
      : `${formatDayMonth(availability.at)} ${time}`;
  }

  return (
    <Card style={styles.service}>
      <View style={styles.top}>
        <View style={styles.texts}>
          <AppText variant="title" color={colors.primary}>
            {localize(service.title)}
          </AppText>
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {localize(service.description)}
          </AppText>
          <AppText variant="label">{service.price ? formatEuros(service.price) : t('home.included')}</AppText>
        </View>
        <View style={styles.avatar}>
          <Icon name={service.icon} size={28} color={colors.primary} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.bottom}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.muted}>
            {t(availability.kind === 'queue' ? 'home.waitingTime' : 'home.nextTime')}
          </AppText>
          <AppText variant="body">{when}</AppText>
        </View>
        <Button
          label={t(booked ? 'home.booked' : 'home.book')}
          icon={booked ? 'check' : undefined}
          variant={booked ? 'outline' : 'primary'}
          onPress={() => setBooked(!booked)}
          style={styles.book}
        />
      </View>
    </Card>
  );
};

export default VetServiceCard;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  service: { gap: spacing.md },
  top: { flexDirection: 'row', gap: spacing.md },
  texts: { flex: 1, gap: spacing.xs },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.divider },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  book: { minWidth: 110, borderRadius: radius.pill },
});
