import type { Category, KnowledgeContent, Substance } from "./content.js";

/** Lower case, no accents: "Lääke" and "laake" match, which helps with voice input and keyboards. */
export const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

/** Edit distance, stopping early once it exceeds `max`. */
export const levenshtein = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) {
    return max + 1;
  }
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) {
      return max + 1;
    }
    previous = current;
  }
  return previous[b.length];
};

const allowedTypos = (query: string) => (query.length >= 8 ? 2 : query.length >= 4 ? 1 : 0);

/** How well one name matches the query, 0 = no match. */
const scoreName = (query: string, name: string) => {
  const target = normalize(name);
  if (target === query) {
    return 100;
  }
  if (target.startsWith(query)) {
    return 80;
  }
  const words = target.split(/[\s-]+/);
  if (words.some((word) => word.startsWith(query))) {
    return 70;
  }
  if (target.includes(query)) {
    return 60;
  }
  const typos = allowedTypos(query);
  if (typos === 0) {
    return 0;
  }
  // Compare to the whole name and to each word (and word prefixes as long as the query).
  const candidates = [target, ...words, ...words.map((word) => word.slice(0, query.length))];
  const distance = Math.min(...candidates.map((candidate) => levenshtein(query, candidate, typos)));
  return distance <= typos ? 50 - distance * 10 : 0;
};

export type SearchHit = { substance: Substance; score: number; matchedName: string };

/**
 * Finds substances by any of their names in any language, so a Finnish speaker can find
 * "lily" by typing "lilja" whatever the app language is. Tolerates small typos.
 */
export const searchSubstances = (
  content: KnowledgeContent,
  options: { query?: string; category?: Category },
): SearchHit[] => {
  const pool = options.category
    ? content.substances.filter((substance) => substance.category === options.category)
    : content.substances;
  const query = normalize(options.query ?? "");

  if (!query) {
    return pool.map((substance) => ({ substance, score: 0, matchedName: substance.names.en[0] }));
  }

  const hits: SearchHit[] = [];
  for (const substance of pool) {
    let best: SearchHit | null = null;
    for (const name of [...substance.names.fi, ...substance.names.sv, ...substance.names.en]) {
      const score = scoreName(query, name);
      if (score > 0 && (!best || score > best.score)) {
        best = { substance, score, matchedName: name };
      }
    }
    if (best) {
      hits.push(best);
    }
  }
  return hits.sort((a, b) => b.score - a.score);
};
