import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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

export default i18n;
