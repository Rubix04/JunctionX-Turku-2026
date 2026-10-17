import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import AppLogo from '@/components/features/app-logo';
import Disclaimer from '@/components/features/disclaimer';
import EmergencyButton from '@/components/features/emergency-button';
import PetAvatar from '@/components/features/pet-avatar';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import IconTile from '@/components/ui/icon-tile';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import OptionGroup from '@/components/ui/option-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { useReloadOnFocus } from '@/hooks/use-reload-on-focus';
import { type Language, supportedLanguages } from '@/i18n';
import { mockHousehold } from '@/services/mock/data';
import { getShares, stopShare } from '@/services/passport';
import { getPets } from '@/services/pets';
import { colors, spacing } from '@/theme';
import { currentLanguage, formatShortDate } from '@/utils/format';

const languageNames: Record<Language, string> = { en: 'English', fi: 'Suomi', sv: 'Svenska' };

const loadSettings = async () => {
  const [pets, shares] = await Promise.all([getPets(), getShares()]);
  return { pets, shares };
};

const SwitchRow = ({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View style={styles.switchRow}>
    <View style={styles.flex}>
      <AppText variant="label">{label}</AppText>
      {hint ? (
        <AppText variant="caption" color={colors.muted}>
          {hint}
        </AppText>
      ) : null}
    </View>
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.primary, false: colors.borderStrong }}
      thumbColor={colors.surface}
    />
  </View>
);

// Account, family, language, device lock, notifications, sharing and privacy.
const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const { displayName, lockMethod, lock, signOut } = useAuth();
  const { data, reload } = useAsync(loadSettings, []);
  useReloadOnFocus(reload);
  const [notifications, setNotifications] = useState({ medication: true, followUps: true, seasonal: true, location: false });
  const [vetConsent, setVetConsent] = useState(true);

  const stop = async (shareId: string) => {
    await stopShare(shareId);
    reload();
  };

  return (
    <Screen
      inTabs
      header={
        <View style={styles.header}>
          <AppText variant="h1" accessibilityRole="header" style={styles.flex}>
            {t('settings.title')}
          </AppText>
          <EmergencyButton />
        </View>
      }
    >
      <View style={styles.profile}>
        <IconTile name="user" size={52} tone="white" />
        <View style={styles.flex}>
          <AppText variant="title">{displayName}</AppText>
          <AppText variant="caption" color={colors.muted}>
            {t('settings.verified')}
          </AppText>
        </View>
      </View>

      <ListGroup>
        <ListRow
          leading={<IconTile name="shieldCheck" />}
          title={t('screens.insurance')}
          subtitle={t('settings.insuranceHint')}
          onPress={() => router.push('/insurance')}
        />
      </ListGroup>

      <SectionLabel label={t('settings.pets')} action={{ label: t('pet.addShort'), href: '/add-pet' }} />
      <ListGroup>
        {(data?.pets ?? []).map((pet) => (
          <ListRow
            key={pet.id}
            leading={<PetAvatar species={pet.species} photoUrl={pet.photoUrl} size={40} />}
            title={pet.name}
            subtitle={[t(`species.${pet.species}`), pet.breed].filter(Boolean).join(' · ')}
            onPress={() => router.push(`/pet/${pet.id}`)}
          />
        ))}
      </ListGroup>

      <SectionLabel label={t('settings.family')} />
      <ListGroup>
        <ListRow leading={<IconTile name="user" />} title={displayName?.split(' ')[0] ?? ''} subtitle={t('settings.owner')} />
        {mockHousehold.members.map((m) => (
          <ListRow key={m.id} leading={<IconTile name="users" />} title={m.name} subtitle={t('settings.member')} />
        ))}
      </ListGroup>
      <AppText variant="caption" color={colors.muted}>
        {t('settings.familyHint')}
      </AppText>

      <SectionLabel label={t('settings.language')} />
      <OptionGroup
        label={t('settings.language')}
        value={currentLanguage()}
        onChange={(lang) => i18n.changeLanguage(lang)}
        options={supportedLanguages.map((lang) => ({ value: lang, label: languageNames[lang] }))}
      />

      <SectionLabel label={t('settings.deviceLock')} />
      {/* Changing the lock needs a new PIN or biometric check; for now it is chosen at sign-in. */}
      {lockMethod && (
        <ListGroup>
          <ListRow leading={<IconTile name={lockMethod} />} title={t(`lock.${lockMethod}`)} />
        </ListGroup>
      )}

      <SectionLabel label={t('settings.notifications')} />
      <ListGroup>
        <SwitchRow
          label={t('settings.notify.medication')}
          value={notifications.medication}
          onChange={(v) => setNotifications({ ...notifications, medication: v })}
        />
        <SwitchRow
          label={t('settings.notify.followUps')}
          value={notifications.followUps}
          onChange={(v) => setNotifications({ ...notifications, followUps: v })}
        />
        <SwitchRow
          label={t('settings.notify.seasonal')}
          value={notifications.seasonal}
          onChange={(v) => setNotifications({ ...notifications, seasonal: v })}
        />
        <SwitchRow
          label={t('settings.notify.location')}
          hint={t('settings.notify.locationHint')}
          value={notifications.location}
          onChange={(v) => setNotifications({ ...notifications, location: v })}
        />
      </ListGroup>

      <SectionLabel label={t('settings.sharing')} />
      {data?.shares.length ? (
        <ListGroup>
          {data.shares.map((share) => (
            <ListRow
              key={share.id}
              leading={<IconTile name="link" />}
              title={t('settings.shareOf', { name: data.pets.find((p) => p.id === share.petId)?.name ?? '' })}
              subtitle={t('settings.shareExpires', { date: formatShortDate(share.expiresAt.slice(0, 10)) })}
              trailing={<Button label={t('share.stop')} variant="dangerOutline" size="small" onPress={() => stop(share.id)} />}
            />
          ))}
        </ListGroup>
      ) : (
        <AppText variant="caption" color={colors.muted}>
          {t('settings.noShares')}
        </AppText>
      )}

      <SectionLabel label={t('settings.privacy')} />
      <ListGroup>
        <SwitchRow
          label={t('settings.vetConsent')}
          hint={t('settings.vetConsentHint')}
          value={vetConsent}
          onChange={setVetConsent}
        />
        <ListRow title={t('settings.privacyNotice')} subtitle={t('settings.privacyNoticeHint')} />
      </ListGroup>

      <View style={styles.buttons}>
        <Button label={t('settings.lockNow')} icon="lock" variant="outline" onPress={lock} />
        <Button label={t('settings.signOut')} icon="logout" variant="dangerOutline" onPress={signOut} />
        <AppText variant="caption" color={colors.muted} style={styles.center}>
          {t('settings.signOutHint')}
        </AppText>
      </View>

      <View style={styles.about}>
        <AppLogo size={40} />
        <AppText variant="caption" color={colors.muted}>
          {t('settings.version', { version: '1.0.0' })}
        </AppText>
        <Disclaimer kind="app" />
      </View>
    </Screen>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchRow: { minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  buttons: { gap: 10, marginTop: spacing.md },
  about: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
});
