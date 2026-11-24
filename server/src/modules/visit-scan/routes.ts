import multipart from "@fastify/multipart";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import sharp from "sharp";
import { z } from "zod";

import { ApiError, badRequest } from "../../errors.js";
import { currentUser } from "../../plugins/auth.js";
import { carePlanSchema, visitSchema } from "../care/schemas.js";
import { createVisitDraft, listCarePlans, saveCarePlan, toCarePlanDto } from "../care/service.js";
import { addDays } from "../care/time.js";
import { todayInFinland } from "../passport/service.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import { type ScanInput, ScanError, type ScanLanguage, type VisitNotesReader } from "./readers.js";
import type { VisitScanResult } from "./schema.js";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Claude reads images best up to about this size on the long edge. */
const IMAGE_LONG_EDGE = 1568;
const languages = ["fi", "sv", "en"] as const;

const visitTitle: Record<ScanLanguage, string> = { fi: "Eläinlääkärikäynti", sv: "Veterinärbesök", en: "Vet visit" };
const followUpLabel: Record<ScanLanguage, string> = { fi: "Jälkitarkastus", sv: "Återbesök", en: "Follow-up" };

const textBodySchema = z.object({ text: z.string().trim().min(10).max(10000) });

const responseSchema = z.object({
  /** "claude" when the AI read the document; "sample" in demo mode */
  source: z.enum(["claude", "sample"]),
  visit: visitSchema,
  /** A draft until the clinic checks it */
  carePlan: carePlanSchema,
  procedures: z.array(z.string()),
  /** Things the AI could not read for sure: show them so the owner checks with the clinic */
  uncertain: z.array(z.string()),
});

const isIsoDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isTime = (value: string | null): value is string => !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Re-encodes a photo upright as JPEG at a size Claude reads well; this also drops GPS metadata. */
const prepareImage = async (data: Buffer) => {
  try {
    return await sharp(data)
      .rotate()
      .resize(IMAGE_LONG_EDGE, IMAGE_LONG_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw badRequest("INVALID_DOCUMENT", "Send a photo (JPEG, PNG, WebP) or a PDF of the vet document");
  }
};

const isPdf = (data: Buffer) => data.subarray(0, 5).toString("latin1") === "%PDF-";

/** Turns the AI's reading into the care plan fields the app already shows. */
const toCarePlanInput = (result: VisitScanResult, lang: ScanLanguage, today: string) => {
  const homeCare = [...result.homeCare];
  for (const medication of result.medications) {
    const details = [medication.dosage, medication.durationDays ? `${medication.durationDays} d` : null].filter(Boolean);
    homeCare.push(details.length ? `${medication.name}: ${details.join(", ")}` : medication.name);
  }
  const clinicName = result.clinicName ?? "";
  // A follow-up becomes a reminder only with a real date; otherwise it stays an instruction.
  const followUp =
    result.followUp && isIsoDate(result.followUp.date) && result.followUp.date >= today
      ? {
          title: result.followUp.title,
          dateTime: `${result.followUp.date}T${isTime(result.followUp.time) ? result.followUp.time : "09:00"}`,
          clinicName,
        }
      : null;
  if (result.followUp && !followUp) {
    homeCare.push(`${followUpLabel[lang]}: ${result.followUp.title}`);
  }
  return {
    diagnosis: result.diagnosis ?? visitTitle[lang],
    vetName: result.vetName,
    findings: result.findings,
    homeCare,
    followUp,
    products: [
      ...result.products.map((p) => ({ productId: null, name: p.name, brand: p.brand ?? "", prescription: null })),
      ...result.medications
        .filter((m) => m.prescription)
        .map((m) => ({ productId: null, name: m.name, brand: "", prescription: { issuedTo: clinicName, pickedUpOn: null } })),
    ],
    originalText: result.transcript,
  };
};

/**
 * Reading a vet document into a draft care plan (spec 2: "the vet's text in plain language").
 * Registered under /pets.
 * - POST /pets/:petId/visits/scan?lang=fi
 *     multipart/form-data with a `file` (photo or PDF), or JSON { "text": "..." }
 *   → a passport visit and its care plan, saved as a draft until the clinic checks it.
 */
export const visitScanRoutes: FastifyPluginAsyncZod<{ reader: VisitNotesReader }> = async (app, { reader }) => {
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 } });
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/:petId/visits/scan",
    {
      schema: {
        params: petParamsSchema,
        querystring: z.object({ lang: z.enum(languages).default("fi") }),
        response: { 201: responseSchema },
      },
    },
    async (request, reply) => {
      const { userId, householdId } = currentUser(request);
      const pet = getPet(app.db, householdId, request.params.petId);
      const { lang } = request.query;

      let input: ScanInput;
      if (request.isMultipart()) {
        let data: Buffer | null = null;
        try {
          for await (const part of request.parts()) {
            if (part.type === "file" && part.fieldname === "file") {
              data = await part.toBuffer();
            }
          }
        } catch (error) {
          if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
            throw badRequest("FILE_TOO_LARGE", "The document can be at most 15 MB");
          }
          throw error;
        }
        if (!data) {
          throw badRequest("INVALID_UPLOAD", "Send the document in a field named 'file'");
        }
        input = isPdf(data) ? { kind: "pdf", data } : { kind: "image", data: await prepareImage(data) };
      } else {
        const body = textBodySchema.safeParse(request.body);
        if (!body.success) {
          throw badRequest("INVALID_TEXT", "Send the notes as { text } (10 to 10000 characters) or upload a file");
        }
        input = { kind: "text", text: body.data.text };
      }

      let scanned;
      try {
        scanned = await reader(input, { petName: pet.name, species: pet.species, lang });
      } catch (error) {
        if (error instanceof ScanError) {
          const status = error.reason === "busy" || error.reason === "unavailable" ? 503 : 422;
          throw new ApiError(status, `SCAN_${error.reason.toUpperCase()}`, error.message);
        }
        throw error;
      }
      const { result, source } = scanned;
      if (!result.isVetDocument) {
        throw new ApiError(422, "NOT_A_VET_DOCUMENT", "This does not look like a document from a vet visit");
      }

      const today = todayInFinland();
      // A date in the future or more than a year back is more likely misread than real.
      const visitedOn =
        isIsoDate(result.visitDate) && result.visitDate <= today && result.visitDate >= addDays(today, -365)
          ? result.visitDate
          : today;
      const carePlan = toCarePlanInput(result, lang, today);
      const visit = createVisitDraft(app.db, pet, userId, {
        title: carePlan.diagnosis.slice(0, 200),
        clinicName: (result.clinicName ?? "").slice(0, 120),
        visitedOn,
      });
      saveCarePlan(app.db, pet, visit.id, carePlan, userId, { allowClinicCheck: false });
      const saved = listCarePlans(app.db, pet).find(({ plan }) => plan.visitRecordId === visit.id)!;

      return reply.status(201).send({
        source,
        visit: { ...visit, vetName: result.vetName },
        carePlan: toCarePlanDto(saved.plan, saved.visit),
        procedures: result.procedures,
        uncertain: result.uncertain,
      });
    },
  );
};
