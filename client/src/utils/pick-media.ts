import * as ImagePicker from 'expo-image-picker';

export type PickedMedia = { uri: string; kind: 'image' | 'video' };

type PickOptions = {
  source: 'camera' | 'library';
  kind: 'image' | 'video';
  /** Square crop for profile pictures */
  square?: boolean;
};

/** Opens the camera or gallery. Returns null if the user cancels or denies permission. */
export const pickMedia = async ({ source, kind, square = false }: PickOptions): Promise<PickedMedia | null> => {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: [kind === 'image' ? 'images' : 'videos'],
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 0.8,
    videoMaxDuration: 30,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : result.assets[0];
  return asset ? { uri: asset.uri, kind: asset.type === 'video' ? 'video' : 'image' } : null;
};
