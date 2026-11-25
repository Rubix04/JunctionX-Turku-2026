import { useTranslation } from 'react-i18next';

import Pill from '@/components/ui/pill';
import { vaccinationStatus } from '@/services/passport';

const tones = { valid: 'green', noExpiry: 'green', dueSoon: 'amber', expired: 'red' } as const;

// "Valid", "Due soon", "Expired" or "No expiry" for a vaccination, from its valid-until date.
const VaccinationPill = ({ validUntil }: { validUntil: string | null }) => {
  const { t } = useTranslation();
  const status = vaccinationStatus(validUntil);
  return <Pill label={t(`passport.vaccine.${status}`)} tone={tones[status]} />;
};

export default VaccinationPill;
