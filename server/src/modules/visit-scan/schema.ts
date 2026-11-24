import { z } from "zod";

// What the AI returns after reading a vet document. Claude's answer is constrained to this shape
// (structured outputs), so every field is present; unknown values are null or empty, never guessed.

export const visitScanSchema = z.object({
  /** False when the image or text is not a veterinary document; then the rest stays empty */
  isVetDocument: z.boolean(),
  /** As written in the document, YYYY-MM-DD */
  visitDate: z.string().nullable(),
  clinicName: z.string().nullable(),
  vetName: z.string().nullable(),
  diagnosis: z.string().nullable(),
  /** What was found and done, in plain language for the owner */
  findings: z.string(),
  /** Procedures done at the visit, e.g. "Urine sample", "Ultrasound" */
  procedures: z.array(z.string()),
  /** The vet's instructions for home care */
  homeCare: z.array(z.string()),
  medications: z.array(
    z.object({
      name: z.string(),
      /** As written, e.g. "1 tablet twice a day" */
      dosage: z.string().nullable(),
      durationDays: z.number().nullable(),
      /** True for a prescription medicine */
      prescription: z.boolean(),
    }),
  ),
  followUp: z
    .object({
      title: z.string(),
      /** YYYY-MM-DD */
      date: z.string().nullable(),
      /** HH:MM */
      time: z.string().nullable(),
    })
    .nullable(),
  /** Products the vet recommended, e.g. a special food */
  products: z.array(z.object({ name: z.string(), brand: z.string().nullable() })),
  /** Short notes on anything unreadable or ambiguous, for the owner to check */
  uncertain: z.array(z.string()),
  /** The document's text as written */
  transcript: z.string(),
});

export type VisitScanResult = z.infer<typeof visitScanSchema>;
