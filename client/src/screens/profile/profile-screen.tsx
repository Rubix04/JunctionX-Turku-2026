import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import AppLogo from '@/components/features/app-logo';
import Disclaimer from '@/components/features/disclaimer';
import LanguageSwitcher from '@/components/features/language-switcher';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import IconTile from '@/components/ui/icon-tile';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { getClaims, getPolicies } from '@/services/insurance';
import { getPets } from '@/services/pets';
import { colors, spacing } from '@/theme';

const loadProfile = async () => {
  const [pets, policies, claims] = await Promise.all([getPets(), getPolicies(), getClaims()]);
  return { petCount: pets.length, policyCount: policies.length, openClaims: claims.filter((c) => c.status !== 'paid').length };
};

// Profile tab: who is signed in, insurance & claims, language and sign out.
const ProfileScreen = () => {
  const { t } = useTranslation();
  const { displayName, signOut } = useAuth();
  const { data, reload } = useAsync(loadProfile, []);
  useReloadOnFocus(reload);

  const insuranceSummary = data
    ? [
        t('profile.policies', { count: data.policyCount }),
        data.openClaims ? t('profile.openClaims', { count: data.openClaims }) : t('profile.noOpenClaims'),
      ].join(' · ')
    : null;

  return (
    <Screen
      inTabs
      header={
        <View style={styles.header}>
          <AppText variant="h1" accessibilityRole="header">
            {t('tabs.profile')}
          </AppText>
        </View>
      }
    >
      <ListGroup>
        <ListRow
          leading={<IconTile name="user" size={48} />}
          title={displayName ?? t('profile.myAccount')}
          subtitle={data ? `${t('profile.myAccount')} · ${t('profile.pets', { count: data.petCount })}` : t('profile.myAccount')}
          href="/account"
        />
      </ListGroup>

      <ListGroup>
        <ListRow
          leading={<IconTile name="shieldCheck" />}
          title={t('screens.insurance')}
          subtitle={insuranceSummary}
          href="/insurance"
        />
        <ListRow leading={<IconTile name="globe" />} title={t('common.language')} trailing={<LanguageSwitcher />} />
      </ListGroup>

      <SectionLabel label={t('profile.aboutUs')} />
      <ListGroup>
        <ListRow leading={<IconTile name="heartPulse" />} title={t('profile.team')} href="/team" />
        <ListRow leading={<IconTile name="info" />} title={t('profile.faq')} href="/faq" />
        <ListRow leading={<IconTile name="phone" />} title={t('profile.support')} href="/support" />
        <ListRow leading={<IconTile name="users" />} title={t('profile.accessibility')} href="/accessibility" />
      </ListGroup>

      <SectionLabel label={t('profile.referTitle')} />
      <ListGroup>
        <ListRow
          leading={<IconTile name="share" tone="amber" />}
          title={t('profile.refer')}
          subtitle={t('profile.referHint')}
          onPress={() => Share.share({ message: t('profile.referMessage') })}
        />
      </ListGroup>

      <Button label={t('profile.signOut')} icon="logout" variant="dangerOutline" onPress={signOut} style={styles.signOut} />

      <View style={styles.about}>
        <AppLogo size={40} />
        <AppText variant="caption" color={colors.muted}>
          {t('profile.version', { version: '1.0.0' })}
        </AppText>
        <Disclaimer kind="app" />
      </View>
    </Screen>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  signOut: { marginTop: spacing.md },
  about: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
});
