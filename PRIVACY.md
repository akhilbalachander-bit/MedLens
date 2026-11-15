# MedLens privacy architecture

Goal: the AI service never receives a patient's name or other identifiers, and
MedLens keeps nothing personal on its servers.

## 1. On the device, before upload (`src/lib/privacy/`)
1. Each photo, or each PDF page (rendered with pdf.js), is drawn onto a canvas.
2. On-device text recognition (Tesseract, served from `/vendor`, never a CDN)
   finds every word and its position.
3. `redact.ts` finds personal details: names (labelled fields, `LAST, FIRST`,
   titles such as Mrs.), birth dates and ages (replaced by HIPAA-style age
   ranges such as `AGE 60–69` or `AGE 90+`), street addresses and
   `City, ST ZIP`, personal phone numbers (a clinic's own number is kept),
   emails, Social Security numbers, and record / account / member / Rx numbers.
   Medicines, doses, dates of care, CPT codes and prices are kept.
4. `shield.ts` paints labelled black boxes over them and re-encodes the page as
   a new JPEG named `page-N.jpg`, which drops photo metadata (GPS, camera).
5. The patient reviews the covered page (`PrivacyReview.tsx`) and can tap or
   drag to cover more. Only after "Looks good" is anything uploaded. If a file
   cannot be checked on the device (for example HEIC on some browsers), it is
   not uploaded.

## 2. On the server (second safety net)
- The AI prompt forbids reading under the boxes or writing any identifier.
- `scrubOutput.ts` scrubs the AI's answer again and drops identifier fields.
- Uploads get neutral names; nothing is written to disk.
- Assistant questions are scrubbed in the browser and again on the server.
- No server-side cache of spoken document text. The only shared cache holds
  interface strings (button labels), never document content.
- Rate limiting counts a salted hash of the IP address, in memory, for an hour.

## 3. Storage
- No database. Results live in the browser tab's `sessionStorage` and vanish
  when the tab closes; `localStorage` holds preferences only.
- If a database is ever added: store no names or identifiers (they never reach
  the server anyway), encrypt at rest with per-record keys held in a managed
  key service, restrict access by role, log access, and keep data only as long
  as needed.

## 4. Transport and browser hardening (`next.config.mjs`)
HTTPS with HSTS, a strict Content-Security-Policy (own code only, no framing),
`Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a
Permissions-Policy allowing only camera and microphone for MedLens itself.

## 5. Limits to be honest about
- Text recognition can miss words (blurry photos, handwriting). That is why the
  patient reviews every page and can cover more by hand.
- Detection is tuned for English-language US documents.
- AI providers process the covered page under their own terms. Use a paid API
  tier for production so submitted content is not used for training.
