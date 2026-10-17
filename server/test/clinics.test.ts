import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clinicRegistry } from "../src/modules/clinics/content.js";
import { distanceKm, driveMinutes, findClinics, openingStatus } from "../src/modules/clinics/service.js";
import { helsinkiToEpoch } from "../src/modules/care/time.js";
import { createTestApp, type TestApp } from "./helpers.js";

// 19 October 2026 is a Monday.
const at = (local: string) => helsinkiToEpoch(local);
const MONDAY_10 = at("2026-10-19T10:00:00");
const SUNDAY_03 = at("2026-10-25T03:00:00");
const clinic = (id: string) => clinicRegistry.clinics.find((c) => c.id === id)!;
const TURKU = { latitude: 60.4518, longitude: 22.2666 };

describe("clinic logic", () => {
  it("measures distances and estimates driving time", () => {
    const km = distanceKm(TURKU, clinic("raisio"));
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(8);
    expect(driveMinutes(0)).toBe(2);
    expect(driveMinutes(10)).toBe(22);
  });

  it("knows when a clinic is open, in Finnish time", () => {
    expect(openingStatus(clinic("aurora"), MONDAY_10)).toMatchObject({ openNow: true, closesAt: "20:00", opensAt: null });
    expect(openingStatus(clinic("aurora"), at("2026-10-19T07:30:00"))).toMatchObject({
      openNow: false,
      opensAt: { daysFromToday: 0, time: "08:00" },
    });
    expect(openingStatus(clinic("aurora"), at("2026-10-19T20:00:00")).opensAt).toEqual({ daysFromToday: 1, time: "08:00" });
    // Closed at the weekend: opens on Monday.
    expect(openingStatus(clinic("kissaklinikka"), at("2026-10-23T18:00:00")).opensAt).toEqual({ daysFromToday: 3, time: "09:00" });
    expect(openingStatus(clinic("meri"), SUNDAY_03)).toMatchObject({ openNow: true, closesAt: null });
  });

  it("puts open clinics first, then the nearest", () => {
    const night = findClinics(TURKU, {}, "en", SUNDAY_03).clinics;
    expect(night.slice(0, 2).map((c) => c.id)).toEqual(["meri", "raisio"]);
    expect(night.slice(2).every((c) => !c.openNow)).toBe(true);

    const day = findClinics(TURKU, {}, "en", MONDAY_10).clinics;
    expect(day.every((c) => c.openNow)).toBe(true);
    expect(day.map((c) => c.distanceKm)).toEqual([...day.map((c) => c.distanceKm)].sort((a, b) => a - b));
  });

  it("filters like the app's map screen", () => {
    const ids = (filters: Parameters<typeof findClinics>[1], now = MONDAY_10) =>
      findClinics(TURKU, filters, "en", now).clinics.map((c) => c.id).sort();
    expect(ids({ emergency: true })).toEqual(["meri", "raisio"]);
    expect(ids({ contracted: true })).toEqual(["aurora", "kaarina", "kissaklinikka", "meri"]);
    expect(ids({ species: "smallAnimal" })).toEqual(["meri", "pikkueläin"]);
    expect(ids({ expertise: "orthopaedics" })).toEqual(["kaarina"]);
    expect(ids({ maxKm: 5 })).not.toContain("raisio");
    expect(ids({ openNow: true }, SUNDAY_03)).toEqual(["meri", "raisio"]);
  });

  it("places the user and the clinics on the schematic map", () => {
    const result = findClinics(TURKU, {}, "en", MONDAY_10);
    for (const point of [result.location, ...result.clinics]) {
      expect(point.mapX).toBeGreaterThanOrEqual(0);
      expect(point.mapX).toBeLessThanOrEqual(1);
      expect(point.mapY).toBeGreaterThanOrEqual(0);
      expect(point.mapY).toBeLessThanOrEqual(1);
    }
    // North is up: Raisio is north of Kaarina.
    const byId = new Map(result.clinics.map((c) => [c.id, c]));
    expect(byId.get("raisio")!.mapY).toBeLessThan(byId.get("kaarina")!.mapY);
    expect(byId.get("raisio")!.mapX).toBeLessThan(byId.get("kaarina")!.mapX);
  });
});

describe("clinics API", () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("lists clinics without signing in, from the city centre when no location is given", async () => {
    const body = (await app.inject({ method: "GET", url: "/clinics" })).json();
    expect(body.location).toMatchObject({ source: "default", latitude: 60.4518 });
    expect(body.registry.status).toBe("sample");
    expect(body.clinics).toHaveLength(6);
    expect(body.clinics[0]).toHaveProperty("hours");
  });

  it("uses the phone's location and the app's filters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/clinics?lat=60.4858&lng=22.1696&contracted=true&species=cat&lang=fi",
    });
    const body = response.json();
    expect(body.location.source).toBe("device");
    expect(body.clinics.map((c: { id: string }) => c.id).sort()).toEqual(["aurora", "kissaklinikka", "meri"]);
    const kehra = body.clinics.find((c: { id: string }) => c.id === "kissaklinikka");
    expect(kehra.expertise).toEqual(["Kissojen sairaudet", "Munuaiset ja kilpirauhanen"]);
  });

  it("rejects half a location", async () => {
    expect((await app.inject({ method: "GET", url: "/clinics?lat=60.45" })).json().error.code).toBe("INVALID_LOCATION");
  });

  it("lists the 24-hour emergency clinics", async () => {
    const { clinics } = (await app.inject({ method: "GET", url: "/clinics/emergency?lat=60.45&lng=22.27" })).json();
    expect(clinics.map((c: { id: string }) => c.id)).toEqual(["meri", "raisio"]);
    expect(clinics.every((c: { openNow: boolean }) => c.openNow)).toBe(true);
  });

  it("shows a clinic card", async () => {
    const card = (await app.inject({ method: "GET", url: "/clinics/aurora?lang=en" })).json();
    expect(card).toMatchObject({
      name: "Pet Clinic Aurora",
      phone: "+358400000002",
      contracted: true,
      directPayment: true,
      bookingUrl: "https://example.com/book/aurora",
      expertise: ["Internal medicine", "Dentistry"],
    });
    expect((await app.inject({ method: "GET", url: "/clinics/nope" })).json().error.code).toBe("CLINIC_NOT_FOUND");
  });

  it("lists the special expertise for the filter", async () => {
    const { expertise } = (await app.inject({ method: "GET", url: "/clinics/expertise?lang=sv" })).json();
    expect(expertise.find((e: { id: string }) => e.id === "surgery")).toEqual({ id: "surgery", label: "Kirurgi", count: 1 });
  });
});
