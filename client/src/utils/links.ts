import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

import i18n from '@/i18n';

/** "+358400000001" -> "+358 40 000 0001" */
export const formatPhone = (phone: string) => phone.replace(/^\+358(\d{2})(\d{3})(\d+)$/, '+358 $1 $2 $3');

/**
 * Opens a link in another app. When the device can't (no phone app on an iPad, no mail app),
 * it says so and shows the number or address, so the user can still use it.
 */
const openOrExplain = (url: string, title: string, body: string) =>
  Linking.openURL(url).catch(() => Alert.alert(title, body));

/** Opens the phone app. Numbers are stored without spaces, e.g. "+358400000001". */
export const callNumber = (phone: string) =>
  openOrExplain(`tel:${phone}`, i18n.t('links.cantCall'), i18n.t('links.callManually', { number: formatPhone(phone) }));

/** Opens directions in the device's maps app */
export const openDirections = (address: string) =>
  openOrExplain(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
    i18n.t('links.cantOpenMaps'),
    address,
  );

/** Opens a new email in the mail app */
export const sendEmail = (address: string) =>
  openOrExplain(`mailto:${address}`, i18n.t('links.cantEmail'), i18n.t('links.emailManually', { address }));

/** Opens a web page (e.g. a clinic's booking page) inside the app. Only https links are opened. */
export const openWebPage = async (url: string) => {
  if (!url.startsWith('https://')) {
    Alert.alert(i18n.t('links.cantOpenPage'));
    return;
  }
  await WebBrowser.openBrowserAsync(url).catch(() => Alert.alert(i18n.t('links.cantOpenPage')));
};
