import { Linking } from 'react-native';

/** Opens the phone app. Numbers are stored without spaces, e.g. "+358400000001". */
export const callNumber = (phone: string) => Linking.openURL(`tel:${phone}`);

/** Opens directions in the device's maps app */
export const openDirections = (address: string) =>
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`);

/** "+358400000001" -> "+358 40 000 0001" */
export const formatPhone = (phone: string) =>
  phone.replace(/^\+358(\d{2})(\d{3})(\d+)$/, '+358 $1 $2 $3');
