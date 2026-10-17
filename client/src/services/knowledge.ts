import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import { mockDelay } from '@/services/mock/delay';
// Copy of server/content/knowledge-base.json, used when the app runs without the backend.
import content from '@/services/mock/knowledge-base.json';
import type {
  AssessInput,
  Assessment,
  ContentStatus,
  KnowledgeCategory,
  RiskLevel,
  SubstanceDetail,
  SubstanceSummary,
} from '@/types/knowledge';
import type { Species } from '@/types/pet';
import { currentLanguage } from '@/utils/format';

// Knowledge base of dangerous substances (spec 10). Backend: server/src/modules/knowledge.
// Public, no sign-in. The mock mirrors the server's search and assessment logic.

type Lang = 'fi' | 'sv' | 'en';
type Texts = Record<Lang, string>;
type RawSubstance = {
  id: string;
  category: KnowledgeCategory;
  names: Record<Lang, string[]>;
  risk: Partial<Record<Species, RiskLevel>>;
  summary: Texts;
  symptoms: Record<Lang, string[]>;
  onset: Texts;
  firstAid?: Texts;
  dose?: {
    compound: string;
    variants: { id: string; unit: 'g' | 'piece'; mgPerUnit: number; label: Texts }[];
    belowLowest?: RiskLevel;
    thresholds: Partial<Record<'dog' | 'cat', { mgPerKg: number; level: RiskLevel }[]>>;
  };
  sources: string[];
};

const substances = content.substances as unknown as RawSubstance[];
const categoryLabels = content.categories as Record<KnowledgeCategory, Texts>;
const riskOrder: RiskLevel[] = ['harmless', 'caution', 'dangerous', 'emergency'];

export const knowledgeCategories = Object.keys(categoryLabels) as KnowledgeCategory[];

const contentStatus = (): ContentStatus => ({
  status: content.meta.status as ContentStatus['status'],
  updatedOn: content.meta.updatedOn,
});

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim();

const toSummary = (s: RawSubstance, lang: Lang, matchedName: string | null = null): SubstanceSummary => ({
  id: s.id,
  name: s.names[lang][0],
  matchedName,
  category: s.category,
  categoryLabel: categoryLabels[s.category][lang],
  risk: { dog: s.risk.dog ?? 'unknown', cat: s.risk.cat ?? 'unknown', smallAnimal: s.risk.smallAnimal ?? 'unknown' },
});

const findSubstance = (id: string) => {
  const substance = substances.find((s) => s.id === id);
  if (!substance) {
    throw new Error(`Substance ${id} not found`);
  }
  return substance;
};

type SearchParams = { q?: string; category?: KnowledgeCategory };

const mockSearch = ({ q, category }: SearchParams, lang: Lang) => {
  const query = normalize(q ?? '');
  return substances
    .filter((s) => !category || s.category === category)
    .map((s) => {
      if (!query) {
        return { s, score: 1, matched: null };
      }
      // Match names in every language, so "lilja" finds lilies in the English app too.
      const names = [...s.names[lang], ...s.names.fi, ...s.names.sv, ...s.names.en];
      const hit = names.find((name) => normalize(name).includes(query));
      const score = !hit ? 0 : normalize(hit).startsWith(query) ? 2 : 1;
      return { s, score, matched: hit && hit !== s.names[lang][0] ? hit : null };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.s.names[lang][0].localeCompare(b.s.names[lang][0]))
    .map((r) => toSummary(r.s, lang, r.matched));
};

export const searchSubstances = async (params: SearchParams): Promise<SubstanceSummary[]> => {
  const lang = currentLanguage();
  if (useMockData) {
    return mockDelay(mockSearch(params, lang), 150);
  }
  const query = new URLSearchParams({ lang });
  if (params.q) query.set('q', params.q);
  if (params.category) query.set('category', params.category);
  const { results } = await apiFetch<{ results: SubstanceSummary[] }>(`/knowledge/substances?${query}`);
  return results;
};

export const getSubstance = async (substanceId: string): Promise<SubstanceDetail> => {
  const lang = currentLanguage();
  if (!useMockData) {
    return apiFetch<SubstanceDetail>(`/knowledge/substances/${substanceId}?lang=${lang}`);
  }
  const s = findSubstance(substanceId);
  return mockDelay({
    ...toSummary(s, lang),
    content: contentStatus(),
    otherNames: s.names[lang].slice(1),
    summary: s.summary[lang],
    symptoms: s.symptoms[lang],
    onset: s.onset[lang],
    firstAid: (s.firstAid ?? (content.defaultFirstAid as Texts))[lang],
    doNotInduceVomiting: true,
    doseOptions: s.dose?.variants.map((v) => ({ variantId: v.id, label: v.label[lang], unit: v.unit })) ?? null,
    sources: s.sources,
  });
};

const actions = {
  emergency: 'goToEmergencyNow',
  dangerous: 'callVetNow',
  caution: 'monitor',
  harmless: 'noAction',
} as const;

// Same rules as server/src/modules/knowledge/assessment.ts.
const mockAssess = (input: AssessInput): Assessment => {
  const s = findSubstance(input.substanceId);
  const notes: Assessment['notes'] = [];
  const speciesRisk = s.risk[input.species];
  let riskLevel: RiskLevel = speciesRisk ?? 'dangerous';
  let basis: Assessment['basis'] = speciesRisk ? 'substance' : 'noSpeciesData';
  if (!speciesRisk) {
    notes.push('noSpeciesData');
  }
  const variant = input.variantId ? s.dose?.variants.find((v) => v.id === input.variantId) : undefined;
  const thresholds = input.species === 'smallAnimal' ? undefined : s.dose?.thresholds[input.species];
  let dose: Assessment['dose'] = null;

  if (!thresholds) {
    if (input.amount) notes.push('noDoseData');
  } else if (!input.amount || !variant) {
    notes.push('amountUnknown');
  } else if (!input.weightKg) {
    notes.push('weightUnknown');
  } else {
    const compoundMg = input.amount * variant.mgPerUnit;
    const mgPerKg = compoundMg / input.weightKg;
    const reached = thresholds.filter((t) => mgPerKg >= t.mgPerKg);
    riskLevel = reached.length ? reached[reached.length - 1].level : (s.dose?.belowLowest ?? riskLevel);
    basis = 'dose';
    dose = {
      compound: s.dose?.compound ?? '',
      variantId: variant.id,
      amount: input.amount,
      unit: variant.unit,
      compoundMg: Math.round(compoundMg),
      mgPerKg: Math.round(mgPerKg * 10) / 10,
    };
  }

  const atLeastDangerous = riskOrder.indexOf(riskLevel) >= riskOrder.indexOf('dangerous');
  return {
    substanceId: s.id,
    species: input.species,
    riskLevel,
    basis,
    dose,
    action: actions[riskLevel],
    next: { quickAssessment: atLeastDangerous, emergencyClinics: riskLevel === 'emergency', callVet: atLeastDangerous },
    notes,
    doNotInduceVomiting: true,
  };
};

/** "My pet ate this": risk level and what to do next */
export const assessExposure = async (input: AssessInput): Promise<Assessment> => {
  if (useMockData) {
    return mockDelay(mockAssess(input));
  }
  const { assessment } = await apiFetch<{ assessment: Assessment }>('/knowledge/assess', {
    method: 'POST',
    body: input,
  });
  return assessment;
};
