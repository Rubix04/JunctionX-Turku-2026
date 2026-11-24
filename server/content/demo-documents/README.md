# Demo vet documents

Made-up vet documents for the demo pets Mirri and Rekku. The clinics, vets, people and phone numbers are invented. They are not medical advice.

| File | Used for |
|---|---|
| `mirri-virtsatieinfektio.txt` | Seeded into every new demo account (`DEMO_MODE=true`) as Mirri's latest visit and care plan. `{visitDate}`, `{courseEnd}` and `{followUp}` are filled in relative to the sign-up day. |
| `mirri-kontrolli.txt` | Scan it in the app: Mirri's follow-up visit. |
| `rekku-ontuminen.txt` | Scan it in the app: Rekku limping after a walk. |
| `rekku-vuositarkastus.txt` | Scan it in the app: Rekku's annual check-up and vaccines. |

To scan one in the app: **Add vet visit → Type or paste**, then paste the text. You can also print it and take a photo, or save it as a PDF.

Without `ANTHROPIC_API_KEY` the scan and the AI analysis return their built-in sample result. With the key, Claude reads the document itself.
