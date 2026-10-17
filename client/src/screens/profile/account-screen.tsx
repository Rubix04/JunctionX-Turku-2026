import { useTranslation } from 'react-i18next';

import PetAvatar from '@/components/features/pet-avatar';
import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import IconTile from '@/components/ui/icon-tile';
import { ListGroup, ListRow } from '@/components/ui/list-group';
import SectionLabel from '@/components/ui/section-label';
import Screen from '@/components/ui/screen';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { mockHousehold } from '@/services/mock/data';
import { getPets } from '@/services/pets';
import { colors } from '@/theme';

// Who is signed in, the family account and the pets in it.
const AccountScreen = () => {
  const { t } = useTranslation();
  const { displayName } = useAuth();
  const { data: pets } = useAsync(getPets, []);

  return (
    <Screen header={<ScreenHeader title={t('profile.myAccount')} />}>
      <ListGroup>
        <ListRow leading={<IconTile name="user" />} title={t('profile.account.name')} subtitle={displayName} />
        <ListRow
          leading={<IconTile name="lock" />}
          title={t('profile.account.signIn')}
          subtitle={t('profile.account.signInValue')}
        />
      </ListGroup>

      <SectionLabel label={t('profile.account.family')} />
      <ListGroup>
        <ListRow leading={<IconTile name="user" tone="amber" />} title={displayName ?? ''} subtitle={t('profile.account.you')} />
        {mockHousehold.members.map((member) => (
          <ListRow
            key={member.id}
            leading={<IconTile name="users" tone="amber" />}
            title={member.name}
            subtitle={t('profile.account.member')}
          />
        ))}
      </ListGroup>
      <AppText variant="caption" color={colors.muted}>
        {t('profile.account.familyHint')}
      </AppText>

      {pets && pets.length > 0 && (
        <>
          <SectionLabel label={t('profile.account.yourPets')} />
          <ListGroup>
            {pets.map((pet) => (
              <ListRow
                key={pet.id}
                leading={<PetAvatar species={pet.species} photoUrl={pet.photoUrl} size={40} />}
                title={pet.name}
                subtitle={pet.breed ?? t(`species.${pet.species}`)}
                href={`/pet/${pet.id}`}
              />
            ))}
          </ListGroup>
        </>
      )}
    </Screen>
  );
};

export default AccountScreen;
