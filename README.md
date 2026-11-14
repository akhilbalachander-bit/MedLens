# MedLens

**Scan → Understand → Listen → Act.** MedLens turns a prescription label or hospital discharge paperwork into plain-language explanations, translations, read-aloud audio, a recovery checklist with safety guidance, and cost/billing help.

> MedLens explains paperwork. It does not diagnose and is not medical advice. In an emergency, call 911.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add GEMINI_API_KEY or OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

With **no API key**, everything still works using built-in fictional data. That covers the sample discharge document (with an offline Spanish translation), the sample bill, letters, reminders and the offline voice assistant. Only scanning your own documents, and translating into languages other than the sample's Spanish, need a key.

## Features

| Area | What it does |
| --- | --- |
| **Home / Scan** | Scan with Camera (rear camera, preview, retake, multi-page), Upload Document (JPG/PNG/WEBP/HEIC/PDF), Try Sample Document. A native-capture/upload fallback is shown when the camera is unavailable. |
| **One analysis call** | `POST /api/analyze` validates the files (type, size, count, magic bytes), sends all pages to the vision model in **one** request, validates the JSON with Zod and returns a single object that powers every tab. |
| **Tab 1: Understand Your Health** | "What happened?" summary at roughly a 5th-grade reading level, diagnoses, medications, original vs. simplified instructions, tappable glossary cards, a language selector and the Listen Aloud player. |
| **Tab 2: Recovery & Safety** | Always-visible 911 banner; red / yellow / green symptom sections with source badges ("From your document" vs. "General safety guidance") and the exact quotes; an explicit message when the document lacks guidance; checklist with timelines taken only from the paperwork, in-app reminders and `.ics` calendar export; follow-up details, with missing fields shown as *Not listed*. |
| **Tab 3: Wallet & Bill Shield** | Brand/generic info, labelled price estimates, GoodRx / Cost Plus Drugs links; shoppable tests with FAIR Health / price-transparency resources; Hospital Bill Auditor (categorized charges, billing glossary, possible duplicates and items to clarify, never called errors); editable letters (itemized bill, financial assistance, charity care, IRS 501(r)) to copy, download or print. Nothing is ever sent automatically. |
| **My Medications** | Full medication cards, read-confidence, a "verify with pharmacist" flag and acknowledgement, and your own added medicines. |
| **Health Instructions** | Instructions, traffic light, checklist and follow-up on one page. |
| **Voice Assistant** | Browser speech recognition (with a text fallback), answers read aloud, emergency-keyword screening. Uses the AI provider when configured, otherwise looks answers up in the document offline. |
| **Settings** | Language, speech speed, voice per language, voice-availability report, text size, custom languages, notification permission, provider status, delete session data. |

## Architecture

```
src/lib/schema.ts           Analysis schema (lenient Zod) + normalisation & safety flags
src/lib/ai/provider.ts      Provider layer: Gemini / OpenAI(-compatible) / mock via env vars
src/lib/ai/prompts.ts       Safety-focused system prompts
src/app/api/analyze         The single primary document-analysis request
src/app/api/translate       Translates the extracted text map (never the image)
src/app/api/bill            Bill auditor (one vision call)
src/app/api/assistant       Voice-assistant Q&A grounded in the analysis
src/lib/translatable.ts     Flattens the analysis into {key: text} for translation
src/lib/store.tsx           Session storage, per-language translation cache
src/lib/speech/engine.ts    SpeechEngine interface + Web Speech implementation
```

- **Translation:** the document is analyzed once. Changing language sends only the extracted text map to `/api/translate`. Medication names, numbers and phone numbers are protected, and results are cached per language for the session.
- **Speech:** `SpeechEngine` is an interface. The browser engine chunks long text, matches voices to the language, and tells the user when no voice for that language is installed. Another provider can be added in `createSpeechEngine()`.
- **Safety rules enforced in code**, not only in the prompt:
  - A medication with low confidence or a missing dose is always flagged for verification.
  - Missing values become `null` and are shown as *Not listed*.
  - Emergency keywords always add 911 guidance.
  - An urgent question never gets an "expected symptoms" answer.
  - Bill duplicates are labelled "for review".
- **Privacy:** no login. Uploads are processed in memory and never written to disk. Results live in `sessionStorage`; only preferences go to `localStorage`.

## Configuration

See `.env.example`. Key variables:

| Variable | Meaning |
| --- | --- |
| `AI_PROVIDER` | `gemini`, `openai` or `mock`. Auto-detected from keys if unset. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Default model: `gemini-2.5-flash`. |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | Any OpenAI-compatible vision endpoint. |
| `MAX_UPLOAD_MB_PER_FILE`, `MAX_UPLOAD_FILES` | Upload limits. |
| `NEXT_PUBLIC_EXTRA_LANGUAGES` | e.g. `de:German:de-DE,ru:Russian:ru-RU` |

`AI_PROVIDER=mock` is for development: every upload returns the fictional sample, and the UI labels it as mock data.

## Testing

```bash
npm test          # unit tests (Vitest)
npm run typecheck
```

The tests in `src/lib/__tests__` pin down the safety rules above: emergency-keyword screening (including phone-keyboard apostrophes such as `can’t`), schema leniency and *Not listed* nulls, medication verification flags, bill duplicate detection, and the offline assistant never offering "expected" symptoms for an urgent question. CI runs typecheck, tests and a production build on every push.

## Deployment

Vercel-compatible (`npm run build`). Photos are downscaled in the browser before upload to stay under serverless request-body limits. Large multi-page PDFs may still exceed Vercel's ~4.5 MB limit; split them or upload page photos instead.
