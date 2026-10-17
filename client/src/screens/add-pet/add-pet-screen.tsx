import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import ScreenHeader from '@/components/features/screen-header';
import AppText from '@/components/ui/app-text';
import Button from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import Note from '@/components/ui/note';
import OptionGroup from '@/components/ui/option-group';
import Screen from '@/components/ui/screen';
import TextField from '@/components/ui/text-field';
import { createPet, updatePetPhoto } from '@/services/pets';
import { colors, fonts, spacing } from '@/theme';
import type { Species } from '@/types/pet';
import { parseDecimal, parseFinnishDate, todayIso } from '@/utils/format';
import { pickMedia } from '@/utils/pick-media';

// Adding a pet creates its own page (spec 11).
const AddPetScreen = () => {
  const { t } = useTranslation();
  const [species, setSpecies] = useState<Species>('dog');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [weight, setWeight] = useState('');
  const [breed, setBreed] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [linkPolicy, setLinkPolicy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const birthDate = birth.trim() ? parseFinnishDate(birth) : null;
  const weightKg = weight.trim() ? parseDecimal(weight) : null;
  const errors = {
    name: !name.trim() ? t('addPet.nameRequired') : null,
    birth: birth.trim() && (!birthDate || birthDate > todayIso()) ? t('addPet.birthInvalid') : null,
    weight: weight.trim() && (!weightKg || weightKg <= 0 || weightKg > 150) ? t('addPet.weightInvalid') : null,
  };
  const valid = !errors.name && !errors.birth && !errors.weight;

  const choosePhoto = async () => {
    const media = await pickMedia({ source: 'library', kind: 'image', square: true });
    if (media) setPhoto(media.uri);
  };

  const create = async () => {
    setSubmitted(true);
    if (!valid) return;
    setSaving(true);
    try {
      const pet = await createPet({
        name: name.trim(),
        species,
        breed: breed.trim() || null,
        birthDate,
        weightKg,
      });
      if (photo) await updatePetPhoto(pet.id, photo);
      router.dismissTo(`/pet/${pet.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title={t('screens.addPet')} backIcon="close" />}
      footer={<Button label={t('addPet.create')} size="large" onPress={create} disabled={saving} />}
    >
      <View style={styles.photoRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('addPet.addPhoto')}
          onPress={choosePhoto}
          style={styles.photo}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoImage} accessible={false} />
          ) : (
            <>
              <Icon name="camera" size={22} color={colors.primary} />
              <AppText variant="caption" color={colors.primary} style={styles.bold}>
                {t('addPet.photo')}
              </AppText>
            </>
          )}
        </Pressable>
        <AppText variant="bodySmall" color={colors.muted} style={styles.flex}>
          {t('addPet.photoHint')}
        </AppText>
      </View>

      <View style={styles.field}>
        <AppText variant="label" style={styles.label}>
          {t('addPet.species')}
        </AppText>
        <OptionGroup
          label={t('addPet.species')}
          value={species}
          onChange={setSpecies}
          height={48}
          options={(['cat', 'dog', 'smallAnimal'] as const).map((s) => ({ value: s, label: t(`species.${s}`) }))}
        />
      </View>

      <TextField
        label={t('addPet.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('addPet.namePlaceholder')}
        autoCapitalize="words"
        error={submitted ? errors.name : null}
      />
      <View style={styles.row}>
        <TextField
          label={t('addPet.birthDate')}
          value={birth}
          onChangeText={setBirth}
          placeholder={t('addPet.datePlaceholder')}
          keyboardType="numbers-and-punctuation"
          error={submitted ? errors.birth : null}
        />
        <TextField
          label={t('addPet.weight')}
          value={weight}
          onChangeText={setWeight}
          placeholder="0.0"
          keyboardType="decimal-pad"
          error={submitted ? errors.weight : null}
        />
      </View>
      <TextField label={t('addPet.breed')} value={breed} onChangeText={setBreed} placeholder={t('addPet.breedPlaceholder')} />

      <Note
        icon="shieldCheck"
        trailing={
          <AppText
            variant="bodySmall"
            color={colors.primary}
            style={styles.bold}
            accessibilityRole="button"
            onPress={() => setLinkPolicy(!linkPolicy)}
          >
            {linkPolicy ? t('addPet.linked') : t('addPet.link')}
          </AppText>
        }
      >
        {t('addPet.policyFound')}
      </Note>
    </Screen>
  );
};

export default AddPetScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  photo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  photoImage: { width: 88, height: 88 },
  field: { gap: spacing.sm },
  label: { fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
});
