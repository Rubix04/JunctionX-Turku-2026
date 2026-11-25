import { useTranslation } from 'react-i18next';

import Pill from '@/components/ui/pill';
import { vaccinationStatus } from '@/services/passport';

const tones = { valid: 'green', dueSoon: 'amber', expired: 'red' } as const;

// "Valid", "Due soon" or "Expired" for a vaccination, from its valid-until date.
const VaccinationPill = ({ validUntil }: { validUntil: string }) => {
  const { t } = useTranslation();
  const status = vaccinationStatus(validUntil);
  return <Pill label={t(`passport.vaccine.${status}`)} tone={tones[status]} />;
};

export default VaccinationPill;
