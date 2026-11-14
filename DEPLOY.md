# Putting MedLens online

MedLens is a standard Next.js app. The simplest way to host it publicly is
**Vercel**, which is free for personal, non-commercial projects and gives you
an `https://` address. HTTPS is required for the phone camera to work.

## 1. Get an API key (one key covers every language)

You do **not** need a separate key per language. One AI key does document
reading, translation into all 30 languages, the voice assistant and the
read-aloud voices.

### Gemini (recommended, has a free tier)
1. Go to <https://aistudio.google.com/apikey> and sign in with a Google account.
2. Click **Create API key** and copy it.
3. This is your `GEMINI_API_KEY`.

> **Privacy:** on Gemini's *free* tier Google may use what you send to improve
> its products. Before real people upload real medical papers, turn on billing
> for the key's Google Cloud project (the paid tier does not use your data
> this way) and set a budget alert. Use only the sample document until then.

### Optional: Google Cloud Text-to-Speech (best voices for Indian languages)
Gemini already provides voices. This is an extra for the most reliable Tamil,
Telugu, Hindi, Bengali, Kannada, Malayalam, Marathi, Gujarati and Punjabi.
1. Open <https://console.cloud.google.com/>, create or pick a project, and
   attach a billing account (there is a free monthly character allowance).
2. Search for **Cloud Text-to-Speech API** and click **Enable**.
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
4. Click the key, under **API restrictions** choose *Restrict key* → *Cloud
   Text-to-Speech API*, and save.
5. This is your `GOOGLE_TTS_API_KEY`.

### Alternative: OpenAI
<https://platform.openai.com/api-keys> → **Create new secret key** →
`OPENAI_API_KEY`. Needs a funded account.

## 2. Deploy on Vercel
1. Make sure the code is on the branch you want to publish (normally `main`).
2. Sign up at <https://vercel.com/signup> with **Continue with GitHub**.
3. **Add New… → Project**, find `MedLens`, click **Import**.
   (If it isn't listed, click *Adjust GitHub App Permissions* and allow it.)
4. Framework is detected as Next.js; leave build settings as they are.
5. Open **Environment Variables** and add:
   - `GEMINI_API_KEY` = your key
   - optionally `GOOGLE_TTS_API_KEY` = your Text-to-Speech key
6. Click **Deploy**. After about a minute you get a public address like
   `https://medlens-yourname.vercel.app` that anyone can open.

Every push to that branch redeploys automatically. Changing an environment
variable needs a redeploy (**Deployments → ⋯ → Redeploy**).

Optional: **Settings → Domains** to use your own domain.

## 3. Keep costs under control
- MedLens limits each visitor per hour (20 document scans, 60 translations,
  60 questions, 400 read-aloud requests). Tune with `RATE_LIMIT_MULTIPLIER`.
  These limits are per server instance, so they are a speed bump, not a cap.
- Set a **budget alert** in Google Cloud (Billing → Budgets & alerts) or a
  **usage limit** in OpenAI. This is the real protection.

## 4. Check it works
- Open the site on your phone, tap **Try Sample Document**.
- **Settings → Read aloud → Test voice** in a few languages.
- **Settings → AI document reader** should say *Connected*.
- Scan a real prescription label with **Scan with Camera**.

## 5. Troubleshooting

Open `https://<your-site>/api/config?check=1`. It makes one tiny test request
and never shows your key.

- `check.ok: false`: document reading is failing. The `error` says why, and
  `availableModels` lists the models your key can use.
- `voiceCheck.ok: false`: the natural voice is failing. The error says why.
  A "busy" or 429 error usually means Gemini's free tier has run out of voice
  requests (its limits for voices are low). Turn on billing for the key's
  project, or add a `GOOGLE_TTS_API_KEY` (Google Cloud Text-to-Speech has a
  generous free monthly allowance).
- Voices sound robotic: that is the device's own voice, used only when the
  natural voice fails *and* the device has a voice for that language. Fix the
  voice check above.
