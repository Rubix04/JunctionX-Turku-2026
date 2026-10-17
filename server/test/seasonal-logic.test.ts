import { describe, expect, it } from "vitest";

import { alertsContent, type AlertCard } from "../src/modules/alerts/content.js";
import { activeCards, activeWindow, matchSymptoms, notesFor, regionFor } from "../src/modules/alerts/season.js";

const card = (id: string) => alertsContent.cards.find((c) => c.id === id) as AlertCard;
const ids = (list: Array<{ card: AlertCard }>) => list.map((item) => item.card.id);

describe("regionFor", () => {
  it("maps latitude to a region of Finland", () => {
    expect(regionFor(undefined)).toBe("south");
    expect(regionFor(60.45)).toBe("south"); // Turku
    expect(regionFor(65.0)).toBe("central"); // Oulu
    expect(regionFor(66.5)).toBe("north"); // Rovaniemi
  });
});

describe("activeWindow", () => {
  it("handles seasons that cross New Year", () => {
    const christmas = card("christmas-new-year");
    expect(activeWindow(christmas, "south", "2026-12-24")).toEqual({ seasonYear: 2026, endsOn: "2027-01-06" });
    expect(activeWindow(christmas, "south", "2027-01-03")).toEqual({ seasonYear: 2026, endsOn: "2027-01-06" });
    expect(activeWindow(christmas, "south", "2027-01-07")).toBeNull();
    expect(activeWindow(christmas, "south", "2026-11-30")).toBeNull();
  });

  it("starts winter earlier in the north", () => {
    const ice = card("winter-ice-cold");
    expect(activeWindow(ice, "north", "2026-11-05")).not.toBeNull();
    expect(activeWindow(ice, "south", "2026-11-05")).toBeNull();
  });
});

describe("activeCards", () => {
  it("picks cards by date, region and species", () => {
    expect(ids(activeCards(alertsContent, { date: "2026-10-17", region: "south", species: "dog" }))).toEqual([
      "spring-ticks-adders",
      "autumn-apples-mushrooms",
      "autumn-hunting-darkness",
    ]);
    expect(ids(activeCards(alertsContent, { date: "2026-10-17", region: "south", species: "cat" }))).toEqual([
      "spring-ticks-adders",
      "autumn-hunting-darkness",
    ]);
    expect(ids(activeCards(alertsContent, { date: "2026-10-17", region: "north", species: "dog" }))).toEqual([
      "winter-salt-antifreeze",
      "autumn-hunting-darkness",
    ]);
  });
});

describe("notesFor", () => {
  it("adds species and age notes that apply to the pet", () => {
    const heat = card("summer-heat-cars");
    expect(notesFor(heat, "dog", 120).map((note) => note.en)).toEqual([
      "Short-nosed breeds overheat especially easily.",
      "Older pets overheat more easily.",
    ]);
    expect(notesFor(heat, "cat", 24)).toEqual([]);
    expect(notesFor(heat, "cat", null)).toEqual([]);
  });
});

describe("matchSymptoms", () => {
  it("finds active alerts that share symptoms with a log entry, best match first", () => {
    const matches = matchSymptoms(alertsContent, { date: "2026-07-10", region: "south", species: "dog" }, [
      "vomiting",
      "headShaking",
    ]);
    expect(matches[0]).toMatchObject({ card: { id: "summer-algae-grass-seeds" }, matchedTags: ["vomiting", "headShaking"] });
    expect(matchSymptoms(alertsContent, { date: "2026-07-10", region: "south", species: "dog" }, ["redPaws"])).toEqual([]);
  });
});

describe("seasonal alert content", () => {
  it("is translated completely", () => {
    for (const c of alertsContent.cards) {
      for (const list of [c.prevention, c.watchFor]) {
        expect(list.sv.length, c.id).toBe(list.fi.length);
        expect(list.en.length, c.id).toBe(list.fi.length);
      }
    }
  });
});
