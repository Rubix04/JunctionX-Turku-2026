import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { getStoredItem, setStoredItem, storageKeys } from '@/services/secure-storage';

import en from './locales/en.json';
import fi from './locales/fi.json';
import sv from './locales/sv.json';

export const supportedLanguages = ['en', 'fi', 'sv'] as const;
export type Language = (typeof supportedLanguages)[number];

const isSupported = (code: string | null): code is Language =>
  supportedLanguages.includes(code as Language);

// Pick the first device language we support, otherwise English.
const getDeviceLanguage = (): Language =>
  getLocales()
    .map((locale) => locale.languageCode)
    .find(isSupported) ?? 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fi: { translation: fi },
    sv: { translation: sv },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
});

/** Switches the app language and remembers it on this device. */
export const changeLanguage = async (language: Language) => {
  await i18n.changeLanguage(language);
  await setStoredItem(storageKeys.language, language).catch(() => undefined);
};

/** Applies the language saved with changeLanguage, if any. Call once on app start. */
export const restoreLanguage = async () => {
  const saved = await getStoredItem(storageKeys.language).catch(() => null);
  if (isSupported(saved)) {
    await i18n.changeLanguage(saved);
  }
};

export default i18n;
