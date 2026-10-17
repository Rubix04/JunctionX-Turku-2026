import type { Species } from "../../db/schema.js";
import type { AlertCard, AlertsContent, Region } from "./content.js";

/**
 * Finland, roughly: the south up to Jyväskylä/Vaasa, central up to Oulu, north is Lapland.
 * Winter comes earlier and summer later in the north, so cards have per-region dates.
 * Without a location the south is used, where most people live.
 */
export const regionFor = (latitude: number | null | undefined): Region => {
  if (latitude === null || latitude === undefined) {
    return "south";
  }
  if (latitude >= 65.5) {
    return "north";
  }
  return latitude >= 62.5 ? "central" : "south";
};

const monthDayOf = (isoDate: string) => isoDate.slice(5);

/**
 * If the card is active on the date, returns which yearly occurrence it is (the year the window
 * started, so 12-01 → 01-06 is one occurrence) and its end date. Otherwise null.
 */
export const activeWindow = (card: AlertCard, region: Region, isoDate: string) => {
  const today = monthDayOf(isoDate);
  const year = Number(isoDate.slice(0, 4));
  for (const window of card.windows[region]) {
    const wraps = window.from > window.to;
    if (!wraps && today >= window.from && today <= window.to) {
      return { seasonYear: year, endsOn: `${year}-${window.to}` };
    }
    if (wraps && today >= window.from) {
      return { seasonYear: year, endsOn: `${year + 1}-${window.to}` };
    }
    if (wraps && today <= window.to) {
      return { seasonYear: year - 1, endsOn: `${year}-${window.to}` };
    }
  }
  return null;
};

export type AlertFilter = {
  date: string;
  region: Region;
  species?: Species;
  ageMonths?: number | null;
};

/** Cards active on the date and region, for the species if given. */
export const activeCards = (content: AlertsContent, filter: AlertFilter) =>
  content.cards.flatMap((card) => {
    if (filter.species && !card.species.includes(filter.species)) {
      return [];
    }
    const window = activeWindow(card, filter.region, filter.date);
    return window ? [{ card, ...window }] : [];
  });

/** Age- and species-specific extra notes that apply to this pet. */
export const notesFor = (card: AlertCard, species: Species | undefined, ageMonths: number | null | undefined) => {
  const notes = card.ageNotes
    .filter(
      (note) =>
        ageMonths !== null &&
        ageMonths !== undefined &&
        (note.minAgeMonths === undefined || ageMonths >= note.minAgeMonths) &&
        (note.maxAgeMonths === undefined || ageMonths <= note.maxAgeMonths),
    )
    .map((note) => note.text);
  const speciesNote = species ? card.speciesNotes[species] : undefined;
  return speciesNote ? [speciesNote, ...notes] : notes;
};

/**
 * Spec 9: "if a log entry matches the seasonal risk, the app mentions it".
 * Returns active cards that share symptom tags with the log entry, best match first.
 */
export const matchSymptoms = (content: AlertsContent, filter: AlertFilter, symptomTags: string[]) => {
  const tags = new Set(symptomTags);
  return activeCards(content, filter)
    .map((active) => ({ ...active, matchedTags: active.card.symptomTags.filter((tag) => tags.has(tag)) }))
    .filter((match) => match.matchedTags.length > 0)
    .sort((a, b) => b.matchedTags.length - a.matchedTags.length);
};
