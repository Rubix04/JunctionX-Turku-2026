import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import ClinicCard from '@/components/features/clinic-card';
import Disclaimer from '@/components/features/disclaimer';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { getEmergencyClinics } from '@/services/clinics';
import { getEmergencySigns } from '@/services/content';
import { colors, spacing } from '@/theme';
import { localize } from '@/utils/format';
import { callNumber } from '@/utils/links';

const loadEmergency = async () => {
  const [clinics, signs] = await Promise.all([getEmergencyClinics(), getEmergencySigns()]);
  return { clinics, signs };
};

/** Leaves emergency mode: back where the user came from, or to the start. */
export const closeEmergency = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Emergency mode, stage 1: call the nearest emergency clinic and a quick check of the
// signs that always need a vet. Works without signing in (spec 6).
const EmergencyScreen = () => {
  const { t, i18n } = useTranslation();
  const isSignedIn = useAuth().status === 'signedIn';
  const { data } = useAsync(loadEmergency, [i18n.language]);
  const nearest = data?.clinics[0];

  return (
    <Screen
      background={colors.red}
      noPadding
      contentStyle={styles.content}
      header={<ScreenHeader backIcon="close" onBack={closeEmergency} onColor showEmergency={false} />}
    >
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Icon name="emergency" size={36} color={colors.onDark} />
        <AppText variant="h1" color={colors.onDark} accessibilityRole="header" style={styles.heroTitle}>
          {t('emergency.title')}
        </AppText>
        <AppText color={colors.redOnDarkBody}>{t('emergency.body')}</AppText>
      </View>

      <View style={styles.section}>
        <SectionLabel label={t('emergency.nearest')} />
        {nearest && <ClinicCard clinic={nearest} emergency linkToDetails={isSignedIn} />}
        {data && data.clinics.length > 1 && (
          <ListGroup>
            {data.clinics.slice(1).map((c) => (
              <ListRow
                key={c.id}
                leading={<Icon name="phone" size={20} color={colors.red} />}
                title={c.name}
                subtitle={c.address}
                onPress={() => (isSignedIn ? router.push(`/clinic/${c.id}`) : callNumber(c.phone))}
              />
            ))}
          </ListGroup>
        )}

        <SectionLabel label={t('emergency.whatsHappening')} />
        <ListGroup>
          {data?.signs.map((sign) => (
            <ListRow
              key={sign.id}
              leading={<Icon name={sign.topicId ? 'heartPulse' : 'alertTriangle'} size={20} color={colors.red} />}
              title={localize(sign.label)}
              subtitle={sign.topicId ? t('emergency.openGuide') : t('emergency.goNow')}
              onPress={sign.topicId ? () => router.push(`/emergency/${sign.topicId}`) : undefined}
            />
          ))}
        </ListGroup>

        <Button
          label={t('emergency.allGuides')}
          icon="book"
          variant="outline"
          size="large"
          onPress={() => router.push('/emergency/first-aid')}
        />
        {isSignedIn && (
          <>
            <Button
              label={t('knowledge.ateSomething')}
              icon="flask"
              variant="dangerOutline"
              onPress={() => router.push('/ate-this')}
            />
            <Button
              label={t('result.otherClinics')}
              icon="map"
              variant="outline"
              onPress={() => router.push('/(tabs)/(map)?mode=emergency')}
            />
          </>
        )}
        <Disclaimer kind="firstAid" />
      </View>
    </Screen>
  );
};

export default EmergencyScreen;

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  hero: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.sm },
  heroTitle: { fontSize: 30 },
  section: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
});
