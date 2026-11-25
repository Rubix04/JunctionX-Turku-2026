import { useAsync } from '@/hooks/use-async';
import { getReminders } from '@/services/care';
import { getPets } from '@/services/pets';

/**
 * "Rekku · yearly vaccination" for the reminder a Book button came from. Links carry only the
 * reminder id and the app looks up the text itself, so a link can't put its own words on screen.
 * Null when there is no id or the reminder isn't found.
 */
export const useBookingLabel = (reminderId: string | null | undefined) => {
  const { data } = useAsync(async () => {
    if (!reminderId) return null;
    const [reminders, pets] = await Promise.all([getReminders(), getPets()]);
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return null;
    const pet = pets.find((p) => p.id === reminder.petId);
    return [pet?.name, reminder.title.toLowerCase()].filter(Boolean).join(' · ');
  }, [reminderId]);
  return reminderId ? data : null;
};
