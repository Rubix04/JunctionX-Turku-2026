import type { z } from "zod";

import type { ShareLanguage, sharedPassportSchema } from "./schemas.js";

type SharedPassport = z.infer<typeof sharedPassportSchema>;

// The page a vet or pet care facility sees when they open a share link in a browser.
// It is server-rendered because the recipient doesn't have the app.

const labels = {
  fi: {
    title: "Terveyspassi",
    sharedNote: "Omistaja on jakanut tämän TassuVahti-sovelluksesta. Linkki on voimassa {date} asti.",
    species: { cat: "Kissa", dog: "Koira", smallAnimal: "Pieneläin" },
    breed: "Rotu",
    birthDate: "Syntymäaika",
    weight: "Paino",
    empty: "Ei merkintöjä",
    sections: {
      vaccinations: "Rokotukset",
      medications: "Lääkitys",
      allergies: "Allergiat",
      surgeries: "Leikkaukset",
      visits: "Aiemmat käynnit",
    },
    fields: {
      givenOn: "Annettu",
      validUntil: "Voimassa",
      batchNumber: "Erä",
      clinic: "Klinikka",
      notes: "Huomiot",
      dosage: "Annostus",
      startDate: "Aloitettu",
      endDate: "Päättyy",
      prescribedBy: "Määrääjä",
      reaction: "Reaktio",
      severity: "Vakavuus",
      notedOn: "Todettu",
      performedOn: "Päivämäärä",
      visitedOn: "Päivämäärä",
      reason: "Syy",
      diagnosis: "Diagnoosi",
    },
    status: {
      valid: "Voimassa",
      expiringSoon: "Vanhenee pian",
      expired: "Vanhentunut",
      noExpiry: "",
      active: "Käytössä",
      ended: "Päättynyt",
    },
    severity: { mild: "Lievä", moderate: "Kohtalainen", severe: "Vakava", unknown: "Ei tiedossa" },
  },
  sv: {
    title: "Hälsopass",
    sharedNote: "Ägaren har delat detta från TassuVahti-appen. Länken gäller till {date}.",
    species: { cat: "Katt", dog: "Hund", smallAnimal: "Smådjur" },
    breed: "Ras",
    birthDate: "Födelsedatum",
    weight: "Vikt",
    empty: "Inga anteckningar",
    sections: {
      vaccinations: "Vaccinationer",
      medications: "Medicinering",
      allergies: "Allergier",
      surgeries: "Operationer",
      visits: "Tidigare besök",
    },
    fields: {
      givenOn: "Given",
      validUntil: "Giltig till",
      batchNumber: "Batch",
      clinic: "Klinik",
      notes: "Anteckningar",
      dosage: "Dosering",
      startDate: "Började",
      endDate: "Slutar",
      prescribedBy: "Ordinerad av",
      reaction: "Reaktion",
      severity: "Allvarlighetsgrad",
      notedOn: "Konstaterad",
      performedOn: "Datum",
      visitedOn: "Datum",
      reason: "Orsak",
      diagnosis: "Diagnos",
    },
    status: {
      valid: "Giltig",
      expiringSoon: "Går snart ut",
      expired: "Utgången",
      noExpiry: "",
      active: "Pågående",
      ended: "Avslutad",
    },
    severity: { mild: "Lindrig", moderate: "Måttlig", severe: "Allvarlig", unknown: "Okänd" },
  },
  en: {
    title: "Health passport",
    sharedNote: "Shared by the owner from the TassuVahti app. This link works until {date}.",
    species: { cat: "Cat", dog: "Dog", smallAnimal: "Small animal" },
    breed: "Breed",
    birthDate: "Date of birth",
    weight: "Weight",
    empty: "No entries",
    sections: {
      vaccinations: "Vaccinations",
      medications: "Medication",
      allergies: "Allergies",
      surgeries: "Surgeries",
      visits: "Previous visits",
    },
    fields: {
      givenOn: "Given",
      validUntil: "Valid until",
      batchNumber: "Batch",
      clinic: "Clinic",
      notes: "Notes",
      dosage: "Dosage",
      startDate: "Started",
      endDate: "Ends",
      prescribedBy: "Prescribed by",
      reaction: "Reaction",
      severity: "Severity",
      notedOn: "Noted",
      performedOn: "Date",
      visitedOn: "Date",
      reason: "Reason",
      diagnosis: "Diagnosis",
    },
    status: {
      valid: "Valid",
      expiringSoon: "Expires soon",
      expired: "Expired",
      noExpiry: "",
      active: "Ongoing",
      ended: "Ended",
    },
    severity: { mild: "Mild", moderate: "Moderate", severe: "Severe", unknown: "Unknown" },
  },
} as const;

type Labels = (typeof labels)[ShareLanguage];
type FieldName = keyof Labels["fields"];

const escapeHtml = (value: unknown) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDate = (isoDate: string, language: ShareLanguage) => {
  const [year, month, day] = isoDate.split("-");
  return language === "en" ? `${day}/${month}/${year}` : `${Number(day)}.${Number(month)}.${year}`;
};

const DATE_FIELDS = new Set<string>(["givenOn", "validUntil", "startDate", "endDate", "notedOn", "performedOn", "visitedOn"]);

const fieldRows = (record: Record<string, unknown>, fields: FieldName[], t: Labels, language: ShareLanguage) =>
  fields
    .filter((field) => record[field] !== null && record[field] !== undefined && record[field] !== "")
    .map((field) => {
      const raw = record[field];
      const value =
        field === "severity"
          ? t.severity[raw as keyof Labels["severity"]]
          : DATE_FIELDS.has(field)
            ? formatDate(String(raw), language)
            : raw;
      return `<div class="row"><dt>${escapeHtml(t.fields[field])}</dt><dd>${escapeHtml(value)}</dd></div>`;
    })
    .join("");

const badge = (text: string, tone: "ok" | "warn" | "bad" | "muted") =>
  text ? ` <span class="badge ${tone}">${escapeHtml(text)}</span>` : "";

type SectionRender = {
  title: (record: Record<string, unknown>) => string;
  badge?: (record: Record<string, unknown>, t: Labels) => string;
  fields: FieldName[];
};

const sectionRenderers: Record<keyof Labels["sections"], SectionRender> = {
  // Allergies first: the most important thing for a vet or a pet sitter to see.
  allergies: {
    title: (r) => String(r.allergen),
    badge: (r, t) => (r.severity === "severe" ? badge(t.severity.severe, "bad") : ""),
    fields: ["reaction", "severity", "notedOn", "notes"],
  },
  medications: {
    title: (r) => String(r.name),
    badge: (r, t) => (r.active ? badge(t.status.active, "ok") : badge(t.status.ended, "muted")),
    fields: ["dosage", "startDate", "endDate", "prescribedBy", "notes"],
  },
  vaccinations: {
    title: (r) => String(r.name),
    badge: (r, t) => {
      const status = r.status as keyof Labels["status"];
      const tone = status === "expired" ? "bad" : status === "expiringSoon" ? "warn" : "ok";
      return badge(t.status[status], tone);
    },
    fields: ["givenOn", "validUntil", "batchNumber", "clinic", "notes"],
  },
  surgeries: { title: (r) => String(r.name), fields: ["performedOn", "clinic", "notes"] },
  visits: { title: (r) => String(r.reason), fields: ["visitedOn", "clinic", "diagnosis", "notes"] },
};

export const renderSharedPassportPage = (passport: SharedPassport, language: ShareLanguage) => {
  const t = labels[language] ?? labels.fi;
  const { pet } = passport;
  const expires = new Intl.DateTimeFormat(language === "en" ? "en-GB" : `${language}-FI`, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Helsinki",
  }).format(passport.expiresAt);

  const petFacts = [
    pet.breed && `<div class="row"><dt>${t.breed}</dt><dd>${escapeHtml(pet.breed)}</dd></div>`,
    pet.birthDate && `<div class="row"><dt>${t.birthDate}</dt><dd>${formatDate(pet.birthDate, language)}</dd></div>`,
    pet.weightKg && `<div class="row"><dt>${t.weight}</dt><dd>${escapeHtml(pet.weightKg)} kg</dd></div>`,
  ]
    .filter(Boolean)
    .join("");

  const sections = (Object.keys(sectionRenderers) as Array<keyof typeof sectionRenderers>)
    .filter((section) => passport[section] !== undefined)
    .map((section) => {
      const renderer = sectionRenderers[section];
      const records = (passport[section] ?? []) as Array<Record<string, unknown>>;
      const items = records.length
        ? records
            .map(
              (record) =>
                `<li><h3>${escapeHtml(renderer.title(record))}${renderer.badge?.(record, t) ?? ""}</h3><dl>${fieldRows(record, renderer.fields, t, language)}</dl></li>`,
            )
            .join("")
        : `<li class="empty">${t.empty}</li>`;
      return `<section><h2>${t.sections[section]}</h2><ul>${items}</ul></section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(pet.name)} – ${t.title}</title>
<style>
  :root { --primary: #0E5A63; --text: #14232B; --muted: #56656C; --bg: #F5F7F6; --border: #DDE3E0;
          --ok: #1F7A4A; --warn: #8A6A00; --bad: #B3261E; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
  header { border-bottom: 3px solid var(--primary); padding-bottom: 12px; margin-bottom: 16px; }
  .brand { color: var(--primary); font-weight: 700; letter-spacing: .02em; }
  h1 { margin: 4px 0; font-size: 28px; }
  h2 { font-size: 20px; color: var(--primary); margin: 28px 0 8px; }
  h3 { font-size: 16px; margin: 0 0 6px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
  li.empty { color: var(--muted); }
  dl { margin: 0; display: grid; gap: 2px; }
  .row { display: grid; grid-template-columns: 140px 1fr; gap: 8px; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
  .badge { font-size: 13px; font-weight: 600; padding: 1px 8px; border-radius: 999px; border: 1px solid currentColor; vertical-align: 1px; }
  .ok { color: var(--ok); } .warn { color: var(--warn); } .bad { color: var(--bad); } .muted { color: var(--muted); }
  .note { color: var(--muted); font-size: 14px; }
  @media print { body { background: #fff; } li { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <header>
    <div class="brand">TassuVahti · ${t.title}</div>
    <h1>${escapeHtml(pet.name)}</h1>
    <div>${t.species[pet.species]}</div>
  </header>
  <dl>${petFacts}</dl>
  ${sections}
  <p class="note">${escapeHtml(t.sharedNote.replace("{date}", expires))}</p>
</main>
</body>
</html>`;
};
