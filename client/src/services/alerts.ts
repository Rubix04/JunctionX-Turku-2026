import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import { mockDelay } from '@/services/mock/delay';
// Copy of server/content/seasonal-alerts.json, used when the app runs without the backend.
// Edit the server file, then run `npm run content:sync`.
import content from '@/services/mock/seasonal-alerts.json';
import type { Season, SeasonalAlert } from '@/types/alerts';
import type { Pet } from '@/types/pet';
import { currentLanguage, todayIso } from '@/utils/format';

// Seasonal alerts for one pet: thin ice, road salt, ticks, heat, fireworks...
// Backend: server/src/modules/alerts. The mock mirrors its date windows for southern Finland.

type Lang = 'fi' | 'sv' | 'en';
type Texts = Record<Lang, string>;
type Window = { from: string; to: string };
type RawCard = {
  id: string;
  season: Season;
  species: string[];
  windows: { south: Window[] };
  title: Texts;
  risk: Texts;
  prevention: Record<Lang, string[]>;
  watchFor: Record<Lang, string[]>;
  ifHappens: Texts;
  speciesNotes?: Partial<Record<string, Texts>>;
};

const cards = content.cards as unknown as RawCard[];

/** The end date of the card's window that contains the date, or null. Windows can wrap over New Year. */
const activeUntil = (card: RawCard, isoDate: string) => {
  const today = isoDate.slice(5);
  const year = Number(isoDate.slice(0, 4));
  for (const { from, to } of card.windows.south) {
    if (from <= to && today >= from && today <= to) return `${year}-${to}`;
    if (from > to && today >= from) return `${year + 1}-${to}`;
    if (from > to && today <= to) return `${year}-${to}`;
  }
  return null;
};

/** Alerts active today for this pet's species. */
export const getSeasonalAlerts = async (pet: Pet): Promise<SeasonalAlert[]> => {
  const lang = currentLanguage();
  if (!useMockData) {
    const { cards: active } = await apiFetch<{ cards: SeasonalAlert[] }>(`/pets/${pet.id}/alerts?lang=${lang}`);
    return active;
  }

  const today = todayIso();
  return mockDelay(
    cards.flatMap((card) => {
      const until = card.species.includes(pet.species) ? activeUntil(card, today) : null;
      if (!until) return [];
      const speciesNote = card.speciesNotes?.[pet.species];
      return [
        {
          id: card.id,
          season: card.season,
          title: card.title[lang],
          risk: card.risk[lang],
          prevention: card.prevention[lang],
          watchFor: card.watchFor[lang],
          ifHappens: card.ifHappens[lang],
          notes: speciesNote ? [speciesNote[lang]] : [],
          activeUntil: until,
        },
      ];
    }),
  );
};
