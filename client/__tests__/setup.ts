import i18n from '@/i18n';

// The app's own i18next instance, in English, so tests can match on the English texts.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
