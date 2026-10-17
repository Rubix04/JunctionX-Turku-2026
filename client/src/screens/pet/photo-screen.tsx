import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PetAvatar from '@/components/features/pet-avatar';
import AppText from '@/components/ui/app-text';
import Icon, { type IconName } from '@/components/ui/icon';
import { useAsync } from '@/hooks/use-async';
import { getPet, updatePetPhoto } from '@/services/pets';
import { colors, fonts, radius, spacing, touchTarget } from '@/theme';
import { pickMedia } from '@/utils/pick-media';

const PhotoAction = ({ icon, label, onPress, danger = false }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
    <Icon name={icon} size={22} color={danger ? colors.redOnPhoto : colors.onDark} />
    <AppText variant="caption" color={danger ? colors.redOnPhoto : colors.onDark} style={styles.semibold}>
      {label}
    </AppText>
  </Pressable>
);

// Profile picture from the camera or gallery, cropped square (spec 13).
const PhotoScreen = () => {
  const { t } = useTranslation();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data: pet } = useAsync(() => getPet(petId), [petId]);
  // undefined = not changed yet, null = removed
  const [picked, setPhoto] = useState<string | null | undefined>(undefined);
  const photo = picked === undefined ? (pet?.photoUrl ?? null) : picked;

  const pick = async (source: 'camera' | 'library') => {
    // The system picker does the move-and-scale crop.
    const media = await pickMedia({ source, kind: 'image', square: true });
    if (media) setPhoto(media.uri);
  };

  const use = async () => {
    await updatePetPhoto(petId, photo);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <AppText variant="label" color={colors.onDark} style={styles.semibold}>
            {t('common.cancel')}
          </AppText>
        </Pressable>
        <AppText variant="title" color={colors.onDark} accessibilityRole="header">
          {t('photo.title')}
        </AppText>
        <Pressable accessibilityRole="button" onPress={use} style={styles.headerButton}>
          <AppText variant="label" color={colors.accent}>
            {t('photo.use')}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <View style={styles.circle}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} accessibilityLabel={t('photo.preview', { name: pet?.name ?? '' })} />
          ) : (
            pet && <PetAvatar species={pet.species} size={300} />
          )}
        </View>
      </View>

      <AppText variant="bodySmall" color={colors.onDarkMuted} style={styles.hint}>
        {photo ? t('photo.hintChange') : t('photo.hintDefault')}
      </AppText>

      <View style={styles.actions}>
        <PhotoAction icon="camera" label={t('photo.camera')} onPress={() => pick('camera')} />
        <PhotoAction icon="image" label={t('photo.gallery')} onPress={() => pick('library')} />
        <PhotoAction icon="trash" label={t('photo.remove')} onPress={() => setPhoto(null)} danger />
      </View>

      <AppText variant="caption" color={colors.onDarkFaint} style={styles.footnote}>
        {t('photo.footnote')}
      </AppText>
    </SafeAreaView>
  );
};

export default PhotoScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.photoBackground },
  semibold: { fontFamily: fonts.bodySemiBold },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { minHeight: touchTarget, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  stage: { marginTop: 36, height: 360, backgroundColor: '#1F2C31', alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: 300, height: 300 },
  hint: { textAlign: 'center', paddingHorizontal: spacing.xxxl, marginTop: spacing.xl },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xxl, marginTop: spacing.xl },
  action: {
    flex: 1,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.photoBorder,
    backgroundColor: colors.photoSurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footnote: { textAlign: 'center', paddingHorizontal: spacing.xxl, marginTop: 'auto', marginBottom: spacing.xl },
});
