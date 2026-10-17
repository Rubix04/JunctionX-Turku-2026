// Reminders are set in Finnish local time ("give it at 8:00"), which moves with daylight saving
// time. These helpers convert between local times and epoch ms.

const DAY_MS = 24 * 60 * 60 * 1000;

const helsinkiParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Helsinki",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Local Finnish time for a moment, e.g. "2026-10-17T08:00:00". */
export const helsinkiLocal = (epochMs: number) => {
  const parts = Object.fromEntries(helsinkiParts.formatToParts(new Date(epochMs)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
};

/** How far Finnish time is ahead of UTC at that moment (2 or 3 hours). */
const offsetAt = (epochMs: number) => Date.parse(`${helsinkiLocal(epochMs)}Z`) - Math.floor(epochMs / 1000) * 1000;

/** Epoch ms of a local Finnish time such as "2026-10-17T08:00:00". */
export const helsinkiToEpoch = (local: string) => {
  const asUtc = Date.parse(`${local}Z`);
  const first = asUtc - offsetAt(asUtc);
  return asUtc - offsetAt(first);
};

/** "2026-10-17", "2026-10-17T08:00" or "2026-10-17T08:00:00" → "2026-10-17T08:00:00". A date alone means 09:00. */
export const normalizeLocal = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T09:00:00`;
  }
  return value.length === 16 ? `${value}:00` : value.slice(0, 19);
};

export const addDays = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Every date from `from` to `to`, both included. */
export const datesBetween = (from: string, to: string) => {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
};
