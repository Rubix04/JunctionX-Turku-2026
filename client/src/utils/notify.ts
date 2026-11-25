import { Alert } from 'react-native';

import i18n from '@/i18n';

/** Tells the user that saving didn't work, e.g. without a connection. Nothing was changed. */
export const alertSaveFailed = () => Alert.alert(i18n.t('common.saveFailedTitle'), i18n.t('common.saveFailedBody'));
