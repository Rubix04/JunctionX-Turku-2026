import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Card from '@/components/ui/card';
import Screen from '@/components/ui/screen';
import { colors, fonts } from '@/theme';

// Placeholder team until real staff profiles and photos are available.
const team = [
  { id: 'laura', name: 'Laura Virtanen', role: 'vet', languages: 'suomi, English' },
  { id: 'mikko', name: 'Mikko Korhonen', role: 'nurse', languages: 'suomi, svenska' },
  { id: 'sara', name: 'Sara Lindqvist', role: 'behaviour', languages: 'svenska, suomi, English' },
] as const;

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('');

const TeamScreen = () => {
  const { t } = useTranslation();

  return (
    <Screen header={<ScreenHeader title={t('profile.team')} />}>
      <AppText variant="body" color={colors.textSecondary}>
        {t('profile.teamIntro')}
      </AppText>
      {team.map((person) => (
        <Card key={person.id} style={styles.card}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary} style={styles.initials}>
              {initials(person.name)}
            </AppText>
          </View>
          <View style={styles.texts}>
            <AppText variant="label">{person.name}</AppText>
            <AppText variant="bodySmall" color={colors.primary}>
              {t(`profile.roles.${person.role}`)}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {t('profile.speaks', { languages: person.languages })}
            </AppText>
          </View>
        </Card>
      ))}
    </Screen>
  );
};

export default TeamScreen;

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.bodyBold },
  texts: { flex: 1, gap: 2 },
});
