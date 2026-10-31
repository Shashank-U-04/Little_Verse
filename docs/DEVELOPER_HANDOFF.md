# LittleVerse AI — Developer Handoff (Developer B: Bolna & Backend)

_Last updated: 30 October 2026. Baseline branch: `feat/bolna-primary-voice`._

This document is everything you need to continue without the original chat. Read sections 1–6 before touching code. **Most of the backend work is already written and tested; your job is to review, configure, deploy and verify it — not to rebuild it.**

> **Status in one line:** Bolna is wired as the tutor's only automatic voice, the session API is secured, and all automated checks pass. **Nothing has been verified with a real microphone on a deployed URL yet.** Do not call voice "working" or "production-ready" until the test in §12 passes.

Deadline context: buildathon submission closes **31 October 2026** (no timezone published — treat it as end of day IST). Interviews Nov 5–7, finale Nov 20.

---

## 1. Project overview and architecture

LittleVerse is a voice-first learning app for ages 4–6. The first and only adventure is **Jungle Counting** (3 challenges: 3 butterflies, 5 bananas, 4 elephants), guided by Miko the elephant.

- **Stack:** Next.js 16.4.2 (App Router, `cacheComponents: true`), React 19.3, TypeScript strict, Tailwind 4, Motion 12, Recharts 3, `@bolna/web-call` 3.0.1.
- **This Next.js has breaking changes vs. older versions.** Read `AGENTS.md` and the bundled docs in `node_modules/next/dist/docs/` before writing route or caching code. Example we hit: a `GET` route handler that never reads the request is **prerendered at build time**.
- **Build:** `npm run build` uses `next build --webpack` (deliberate; Turbopack's native binding was missing on the original machine).
- **Persistence:** browser `localStorage` only (`littleverse:sessions`). No database, no auth. Parent pages are unauthenticated — acceptable only because data never leaves the device.
- **Core principle:** *the AI talks, the app grades.* Correctness, hints, scores and progress are deterministic code in `src/features/learning/`. Bolna never decides whether an answer is right.

### Runtime voice flow

```
Child's browser                         Our Next.js server                      Bolna cloud
───────────────                         ──────────────────                      ───────────
GET  /api/voice/status  ──────────────▶ provider, ready?, code needed?, unlocked?
(grown-up consents + types access code)
POST /api/voice/unlock {code} ────────▶ checks code, rate-limits, sets HttpOnly
                                         cookie lv_voice_pass (signed, 4 h)
"Talk to Miko" click
 └ BolnaWebCall.start()
    └ getSession() →
POST /api/bolna-session  ─────────────▶ origin ✓ → config ✓ → pass ✓ → lesson ✓
  {adventure_id, challenge_index}        → rate limit (Upstash) ✓
                                         → POST /web-call/freeswitch-session ──▶ mint
                                           {agent_id, user_data:{lesson…}}
                         ◀───────────── ephemeral SIP session (single use, ~120 s)
 └ mic permission → WebRTC audio ◀════════════════════════════════════════════▶ agent
                                                                    (Deepgram → LLM → ElevenLabs)
Tap answers / Next → validated locally by the learning engine (call stays live)
```

## 2. What is already implemented (do not rebuild)

Commits on `feat/bolna-primary-voice`, oldest first:

| Commit | What it does |
|---|---|
| `fd9f36c` | The pre-existing Bolna integration, committed unchanged: adapter around the SDK, server mint route, mic-ownership gate, browser speech controller, mocked lifecycle tests. |
| `a14fe9c` | **Server fixes.** Origin check now uses the Host / `x-forwarded-host` header (it used `request.url`, which `next dev` rewrites to `localhost` → 403 on 127.0.0.1, LAN IPs and phones). Production 503 kill-switch replaced by: access code → signed HttpOnly pass cookie; per-client + global fixed-window rate limits in **Upstash Redis via REST (no SDK)**, **fail-closed** if the store is missing or errors; in-memory limiter only outside production. Server builds Bolna `user_data` from trusted lesson definitions (browser sends only ids; answers never sent). New routes `/api/voice/status`, `/api/voice/unlock`. Explicit `VOICE_PROVIDER` (`bolna` \| `browser`; anything else = voice off). |
| `7912b05` | Client asks for lesson-aware sessions (`requestBolnaSession`) via the SDK's `getSession`; server error codes become child-friendly messages through the SDK error's `cause`. |
| `8bc479e` | **Bolna is the only automatic tutor voice.** `speechSynthesis` runs only when the user explicitly taps "Use device voice instead" (labelled, reversible). Tapping answers / pressing Next no longer hangs up the call. Parent disclosure + consent dialog before any voice use (also collects the access code). Status text driven only by SDK events. Unit + Playwright tests for all of this. |
| `d2806f3` | Parent settings privacy notice corrected (it falsely said no recordings are retained), consent withdrawal button. |
| later commits | Cleanup (`.gitignore`, `.env.example`), `/api/voice/status` made dynamic (it was being prerendered), consent wording fix, this handoff. |

**Verified on 30 Oct (local, Windows, Chrome):** `npm run lint` clean · `npx tsc --noEmit` clean · `npm test` **31/31** · `npx playwright test` **36/36** (desktop + Pixel 5 mobile Chromium, incl. axe) · `npm run build` passes · client bundle (`.next/static`) contains no API key, agent id, `bn-` pattern or secret env names · production server (`next start`) with no access code returns `503 access_code_missing` and cross-site requests return `403`.

**Not verified:** a real two-way Bolna call; Vercel deployment; Upstash in production; whether Bolna substitutes our `user_data` into the prompt/welcome (requires the dashboard change in §10).

## 3. The Bolna integration and the frontend/backend contract

### Files

| Path | Role |
|---|---|
| `src/app/api/bolna-session/route.ts` | Mints a Bolna session. Order: origin → readiness → pass cookie → lesson body → rate limit → mint → validate shape. |
| `src/app/api/voice/status/route.ts` | `GET` — what voice is configured (no secrets). Must stay dynamic (reads the request first). |
| `src/app/api/voice/unlock/route.ts` | `POST {code}` — exchanges the access code for the pass cookie. Rate-limited. |
| `src/lib/voice/server/config.ts` | Reads env, decides readiness. **Single source of truth for env vars.** |
| `src/lib/voice/server/origin.ts` | Same-origin check (Host / forwarded host, `Sec-Fetch-Site`, `VOICE_ALLOWED_ORIGINS`). |
| `src/lib/voice/server/voicePass.ts` | Timing-safe code compare; HMAC-signed pass `v1.<expiry>.<sig>`; key derived from `DEMO_ACCESS_CODE` + `BOLNA_API_KEY`. |
| `src/lib/voice/server/rateLimit.ts` | Upstash REST store (`INCR` + `EXPIRE` pipeline), dev memory store, hashed client IPs. |
| `src/lib/voice/server/lessonContext.ts` | Validates `{adventure_id, challenge_index}`; builds `user_data`. |
| `src/lib/voice/bolnaSession.ts` | Client: `requestBolnaSession()`, `VoiceSessionRequestError` with `childMessage`. |
| `src/lib/bolna/bolnaCallAdapter.ts` | Wraps `BolnaWebCall`; UI states; `ownsAudio()`. |
| `src/lib/voice/microphoneOwnership.ts` | Synchronous mutex: `browser-recognition` vs `bolna-call`. |
| `src/lib/voice/browserSpeechController.ts` | Device TTS; refuses to speak unless `isEnabled()` and Bolna doesn't own audio. |
| `src/lib/voice/voiceConsent.ts` | Consent storage (`littleverse:voice-consent`, version 1) and `TutorVoiceMode`. |

Server modules import each other with relative `.ts` paths (not `@/`) **on purpose**: the Node test runner (`node --experimental-strip-types`) imports the route files directly and cannot resolve tsconfig path aliases. Keep it that way.

### HTTP contract

**`GET /api/voice/status`** → `200`
```json
{ "provider": "bolna", "bolnaReady": true, "reason": null, "accessCodeRequired": true, "unlocked": false }
```
`reason` is a safe adult-facing string when `bolnaReady` is false.

**`POST /api/voice/unlock`** body `{"code":"…"}` → `200 {"unlocked":true}` + `Set-Cookie: lv_voice_pass=…; Path=/api; HttpOnly; SameSite=Strict; Secure(prod); Max-Age=14400`. Errors: `401 wrong_code`, `429 rate_limited` (10 tries / 10 min / client), `403 forbidden_origin`, `503 <readiness code>` / `limiter_unavailable`.

**`POST /api/bolna-session`** body `{"adventure_id":"jungle-counting","challenge_index":0}` → `200` Bolna session JSON (`run_id`, `sip_*`, `wss_url`, `ice_servers`, `expires_in`…). Errors are `{"error":"…","code":"…"}`:

| Status | `code` | Meaning |
|---|---|---|
| 403 | `forbidden_origin` | Not a same-origin browser request |
| 503 | `provider_invalid`, `not_bolna`, `bolna_not_configured`, `access_code_missing`, `rate_limit_store_missing` | Server not configured for Bolna |
| 401 | `locked` | No valid pass cookie (grown-up must unlock) |
| 400 | `invalid_lesson` | Unknown adventure or index out of range |
| 503 | `limiter_unavailable` | Upstash unreachable → fail closed |
| 429 | `rate_limited` (+ `Retry-After`) | Per-client (6 / 10 min) or global (150 / day) limit |
| 429 | `at_capacity` | Bolna concurrency limit |
| 502/504 | `upstream_*` | Bolna mint failed / timed out / bad shape |

### `user_data` sent to Bolna (built on the server)

| Key | Example |
|---|---|
| `adventure_title` | `Jungle Counting Adventure` |
| `learning_objective` | `Practice counting and number recognition with Miko` |
| `total_challenges` | `3` |
| `current_challenge_number` | `1` |
| `current_prompt` | `Look at the butterflies! Can you count them?` |
| `current_objects` | `butterflies` |
| `challenge_list` | numbered list of all prompts with object names and answer-button numbers |

Expected answers and object counts are **deliberately excluded**.

### Audio ownership (client)

- Adapter UI states: `idle → connecting → requesting_permission → active → ending → ended`, or `error`.
- `bolnaAdapter.ownsAudio()` is true in `requesting_permission | connecting | active | ending`, and in `error` if the SDK call is still live (unconfirmed hang-up).
- While Bolna owns audio: device TTS is silenced, the browser speech-recognition mic button is disabled. Tap answers and Next **remain enabled** and do not end the call.
- `TutorVoiceMode`: `bolna` (default when provider is bolna; device TTS never runs) · `device` (only after an explicit tap, or `VOICE_PROVIDER=browser`) · `off` (status unknown / misconfigured).
- The SDK has **no transcript events** in the browser. Do not design features that need them.

## 4. Your remaining tasks (Developer B)

1. **Review** `a14fe9c` and `7912b05` (`git show a14fe9c`, `git show 7912b05`). Report anything wrong — do not rewrite working code without a reason written in the PR.
2. **Review** `src/lib/bolna/bolnaCallAdapter.ts` + `microphoneOwnership.ts` and confirm you understand the ownership lifecycle in §3.
3. **Set up Vercel** (§7) and **Upstash** (§8); set every env var in §9.
4. **Paste the Bolna agent prompt and welcome message** (§10) after the repo owner approves the text.
5. **Verify session + lesson context** (§11).
6. **Run the real two-way microphone test** (§12) on the deployed URL, desktop Chrome and one Android phone.
7. **Email Bolna support** about recording/transcript retention (§13, template included).
8. **Report** results, blockers and evidence (§15 format) in the PR description.

## 5. Files and directories you own

| You (Developer B) own | Developer A (repo owner) owns |
|---|---|
| `src/app/api/**` | `src/app/parent/**` |
| `src/lib/voice/server/**` | `src/components/**` (incl. `VoiceConsentDialog.tsx`, `VoiceButton.tsx`) |
| `src/lib/bolna/**` | JSX/layout in `src/app/adventure/**` and `src/components/adventure/**` |
| `src/lib/voice/bolnaSession.ts`, `microphoneOwnership.ts`, `browserSpeechController.ts` | `src/app/page.tsx`, styles |
| `.env.example`, Vercel/Upstash/Bolna dashboard config | Demo script, screenshots, pitch video |
| `tests/bolna.test.ts`, `tests/voiceServer.test.ts` | `tests/e2e/learning.spec.ts` (coordinate — shared) |

**Shared, coordinate before editing:** `src/components/adventure/AdventurePlayer.tsx` (voice wiring, shared by every adventure route), `src/lib/voice/voiceConsent.ts`, `src/lib/voice/voiceStatus.ts`, `package.json`. If you need a contract change (new error code, new status field), agree it with Developer A first.

**Do not touch:** `src/features/learning/**` (the deterministic learning engine) without both developers agreeing.

## 6. Already done — do NOT rebuild

- Origin validation fix · production access control (access code + signed cookie) · durable rate limiting · fail-closed behaviour
- Lesson context via `user_data` · lesson-aware `getSession`
- Bolna as primary voice · no silent fallback · opt-in labelled device voice · call survives taps and Next
- Consent/disclosure UI · consent withdrawal · corrected privacy copy
- Unit + e2e tests for all of the above · secret scan of the client bundle

## 7. Vercel setup

You need edit access to the GitHub repo `Shashank-U-04/Little_Verse` (ask the owner to add you under **Settings → Collaborators**) and to the Vercel project (owner invites you, or the owner does these steps while you watch).

1. Go to **vercel.com → Add New… → Project → Import Git Repository**, pick `Shashank-U-04/Little_Verse`. If it is not listed, click **Adjust GitHub App Permissions** and grant access to that repo.
2. Framework preset: **Next.js** (auto). Root directory: `./`. Leave Build Command as default (it runs `npm run build`, which is `next build --webpack`). Install command default.
3. **Before the first deploy**, open **Environment Variables** and add everything in §9 for **Production** and **Preview** (mark secrets as **Sensitive**). Then click **Deploy**.
4. **Which branch is "production":** Vercel's production branch defaults to `main`. Our work is on `feat/bolna-primary-voice` / feature branches, which deploy as **Preview** URLs. Preview URLs are protected by **Vercel Authentication** by default (Settings → Deployment Protection), so judges cannot open them. For the submission link, the repo owner must either merge the reviewed PR into `main` (preferred) or temporarily change **Settings → Git → Production Branch**.
5. After changing any env var, **Redeploy** (Deployments → ⋯ → Redeploy). Env changes do not apply to existing deployments.
6. Local env from Vercel (avoids passing secrets around):
   ```bash
   npm i -g vercel
   vercel login
   vercel link            # choose the LittleVerse project
   vercel env pull .env.local
   ```
   `.env.local` is git-ignored. Never commit it.

## 8. Upstash Redis setup (rate limiting)

Production **refuses to start voice sessions** without this (`rate_limit_store_missing`). Pick one:

**A. Through Vercel (recommended):** Vercel project → **Storage** tab (or **Integrations → Marketplace**) → **Upstash → Redis** → Create database (free tier is enough; choose a region near your Vercel functions) → **Connect** it to the LittleVerse project for Production and Preview. Vercel injects env vars automatically — typically `KV_REST_API_URL` and `KV_REST_API_TOKEN` (some integrations name them `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). **Our code accepts either pair.** Check the names under Settings → Environment Variables after connecting, then redeploy.

**B. Directly:** console.upstash.com → **Create Database** (Redis) → open it → **REST API** section → copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** → add both to Vercel env vars → redeploy.

Verify: `GET https://<deployment>/api/voice/status` must **not** say `"Voice is off: the rate-limit store is not configured."`. Keys created look like `lv:rl:session-client:<hash>:<window>` and expire on their own.

## 9. Environment variables

All are **server-only**. Never prefix any of them with `NEXT_PUBLIC_`. Template: `.env.example`.

| Variable | Required | Secret? | Purpose | Where to get it |
|---|---|---|---|---|
| `BOLNA_API_KEY` | Yes | **Secret** | Mints Bolna sessions; also part of the pass-signing key | platform.bolna.ai → Developers / API Keys (starts with `bn-`) |
| `BOLNA_AGENT_ID` | Yes | Server-only (not secret, keep private) | Which agent to call (UUID) | Bolna dashboard → the agent ("YC hack") → its id / URL |
| `VOICE_PROVIDER` | Recommended | No | `bolna` (default) or `browser` | Set to `bolna` |
| `DEMO_ACCESS_CODE` | **Yes in production** | **Secret** | Grown-up code to unlock voice; protects credits | Invent: 12+ random chars. Share only with judges/testers privately (e.g. in the pitch email), never in the repo |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` **or** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | **Yes in production** | Token is **secret** | Durable rate limiting | §8 |
| `VOICE_SESSIONS_PER_CLIENT` | No (6) | No | Sessions per client per window | — |
| `VOICE_SESSION_WINDOW_SECONDS` | No (600) | No | Window length | — |
| `VOICE_SESSIONS_PER_DAY` | No (150) | No | Global daily cap (cost ceiling) | Consider **60** during judging |
| `VOICE_ALLOWED_ORIGINS` | No | No | Extra allowed origins, comma-separated (custom domain) | — |

Cost ceiling, roughly: each call is capped at 300 s by the agent (`call_terminate`). 150 sessions/day × 5 min = 750 min/day worst case; at Bolna's bundled ~$0.06/min that is about $45/day. Lower `VOICE_SESSIONS_PER_DAY` if the wallet is small.

## 10. Bolna dashboard configuration (paste manually, after owner approval)

Agent: **"YC hack"** (id in `BOLNA_AGENT_ID`). Current state (read via API on 30 Oct): welcome message is the default **"Hello from Bolna"**; prompt is a Miko persona with **no lesson variables**; LLM `gpt-5.4-mini`; transcriber Deepgram `nova-3` English; voice ElevenLabs "Gudiya"; `call_terminate` 300 s; `hangup_after_silence` 0.

Bolna substitutes `user_data` keys written as `{variable_name}` into the prompt and welcome message. Use exactly these names (they match §3).

### Welcome message

```
Hi explorer! I'm Miko the elephant. Welcome to the {adventure_title}! {current_prompt}
```

### System prompt

```
# Identity
You are Miko, a warm, friendly elephant who helps children aged 4 to 6 learn counting in LittleVerse's {adventure_title}.

# Today's lesson (sent by the LittleVerse app)
Learning objective: {learning_objective}
When the call started, the child was on challenge {current_challenge_number} of {total_challenges}: "{current_prompt}" (they are looking at {current_objects}).
All challenges, in order:
{challenge_list}

# How the lesson works
- The screen shows pictures and big number buttons. The child answers by TAPPING a number. The app checks the answer, gives hints and moves to the next challenge.
- You cannot see the screen and you do not know the correct answers. Never say an answer is right or wrong. Never say how many objects there are. Never award points, stars or prizes.
- When the child says a number, praise the effort and invite them to tap it: "Great counting! Tap that number on the screen to check!"
- Help them count: suggest pointing at each one and counting slowly together, "one... two... three...", but let the child say the final number.
- When the child says they finished or the screen moved on, continue with the next challenge in the list. If you are not sure which challenge is showing, ask the child what animals or fruit they can see.

# How you speak
- At most two short sentences per turn. One question at a time.
- Cheerful, patient and gentle. Simple words a 4-year-old knows. Never shame or rush.
- If you cannot understand the child, say: "Let's try together! You can also tap the answer on the screen."

# Child safety
- Never ask for, or repeat, a full name, address, phone number, school or any personal detail. If the child shares one, do not repeat it; gently go back to counting.
- Never encourage secrecy from parents or caregivers.
- Stay on counting and the jungle adventure. For other topics, say you love counting and steer back.
- If the child sounds upset, hurt or mentions danger, say kindly: "That sounds important. Please tell a grown-up you trust right now." Then stop the lesson talk.
- Never use frightening, violent or grown-up content.

# Ending
When all challenges are done or the child wants to stop, say goodbye warmly: "You were an amazing counter today! Bye-bye!"
```

### Recommended agent settings (dashboard)

- Keep **call terminate ≤ 300 s** (cost and child-screen-time cap).
- Set **hang up after silence** to ~30 s if available (currently 0 = disabled) so abandoned calls stop billing.
- Add Deepgram keywords `one, two, three, four, five, butterflies, bananas, elephants` if the transcriber supports keyword boosting.
- Leave webhooks off for now; we don't consume them.

Save, then confirm via the API (optional): `GET https://api.bolna.ai/v2/agent/<agent_id>` with `Authorization: Bearer <key>` shows the new welcome message. Never paste the key into chat, logs or the PR.

## 11. Testing the voice integration

### Automated (run before every push)

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test                      # 31 unit tests: routes, origin, pass, rate limit, adapter, speech gating, consent
npx playwright install chromium   # once
npm run test:e2e              # 36 cases; starts next dev on 127.0.0.1:3000 using .env.local
npm run build                 # all three /api routes must show ƒ (Dynamic), never ○ (Static)
```

`npm run build` also runs `scripts/check-build-css.mjs`, which fails the build if the production CSS has no Tailwind utilities. Tailwind is processed by `postcss.config.mjs` (`@tailwindcss/postcss`); without it the webpack build shipped a completely unstyled site (30 Oct) while every dev-server test passed. Builds download the Nunito font from Google Fonts; a one-off `next/font` error is usually a network blip — retry once.

The e2e suite never mints a real Bolna session (it stubs or never consents). If `DEMO_ACCESS_CODE` is set in your `.env.local`, the "failed Miko connection" test will see the code field — unset it locally for e2e, or update the test.

### Secret scan of the built client bundle (after `npm run build`)

```bash
set -a; . ./.env.local; set +a
grep -rlF "$BOLNA_API_KEY" .next/static | wc -l      # must print 0
grep -rlF "$BOLNA_AGENT_ID" .next/static | wc -l     # must print 0
grep -rlE 'BOLNA_API_KEY|DEMO_ACCESS_CODE|KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN' .next/static | wc -l   # 0
```

### Local manual check

```bash
npm run dev
curl http://localhost:3000/api/voice/status
```
Open http://localhost:3000/adventure/jungle-counting → status chip "Miko's voice: not connected" → **Talk to Miko** → consent dialog → agree → tap **Talk to Miko** again → allow mic → chip goes "Connecting to Miko…" → "Live: Miko can hear you". Works on `localhost`, `127.0.0.1` and LAN IPs. (Phones over LAN need HTTPS for the mic — test phones on the Vercel URL instead.)

### Production-mode check on your machine

Add `DEMO_ACCESS_CODE` and the Upstash pair to `.env.local`, then `npm run build && npm start`. Without them, `/api/voice/status` must report not ready and `/api/bolna-session` must return `503` — that fail-closed behaviour is intended.

### Deployed checks (replace `$URL`)

```bash
curl -s $URL/api/voice/status          # expect bolnaReady:true, accessCodeRequired:true, unlocked:false
curl -s -X POST $URL/api/bolna-session -H "Origin: https://evil.example" -w " %{http_code}\n"   # expect 403
curl -s -X POST $URL/api/bolna-session -H "Origin: $URL" -H "Content-Type: application/json" \
  -d '{"adventure_id":"jungle-counting","challenge_index":0}' -w " %{http_code}\n"            # expect 401 locked
```

### Verifying lesson context reached the agent

1. In a real call (§12), Miko's **first sentence** should contain "Jungle Counting Adventure" and "Look at the butterflies! Can you count them?". If you hear literal braces or "Hello from Bolna", the dashboard text was not saved or variables are not substituted.
2. Bolna dashboard → **Call history / Executions** → open the call (match the time; the SDK's run id equals the execution id) → check the transcript and the context/user data shown.

## 12. Verifying a real two-way microphone conversation

Use the **deployed production URL**, desktop **Chrome** with **headphones** (echo cancellation is on, but speakers can make Miko hear herself). Then repeat on one **Android Chrome** phone. Screen-record both — this doubles as pitch footage.

| # | Do | Expected | Evidence |
|---|---|---|---|
| 1 | Open `/adventure/jungle-counting` in a fresh profile | Chip: "Miko's voice: not connected". No sound plays on its own | Screenshot |
| 2 | Tap **Talk to Miko** | Grown-up dialog listing Bolna, Deepgram, OpenAI, ElevenLabs and the recording notice; access-code field | Screenshot |
| 3 | Wrong code → submit | "That access code didn't match." | — |
| 4 | Right code + checkbox → agree | Dialog closes; "Voice is on…" | — |
| 5 | Tap **Talk to Miko** → allow mic | Chip "Connecting to Miko…" → "Live: Miko can hear you" | Screenshot |
| 6 | Listen | Welcome mentions Jungle Counting and butterflies (proves `user_data`) | Recording timestamp |
| 7 | Say "three" | Miko praises and asks you to **tap** it; does **not** say "correct" | Transcript |
| 8 | Tap **3** | App shows correct; **call stays live** | — |
| 9 | Tap **Next**, say "I see bananas" | Miko continues with bananas | — |
| 10 | Ask "What's your favourite movie?" | Miko steers back to counting | Transcript |
| 11 | In DevTools console: `speechSynthesis.speaking` | `false` throughout | Screenshot |
| 12 | Tap **End talk with Miko** | Chip back to "not connected"; mic indicator off | — |
| 13 | Bolna dashboard → Executions | Call listed `completed`, transcript has both sides | Screenshot (blur any personal data) |
| 14 | Start/stop 7 calls within 10 min from one device | 7th shows "Miko needs a little rest…" | Screenshot |

**Pass** = steps 5–9 and 12 succeed on desktop Chrome **and** Android Chrome. Only then may anyone describe voice as working.

## 13. Known issues and risks

- **Bolna keeps call recordings and transcripts.** The one completed test call (29 Oct, 8 s) has both a transcript and a recording URL. Bolna's security docs say recordings are "available in execution record; contact support for retention policy", with no documented way to turn recording off. The consent dialog and settings say this honestly. **Do not let real children use voice until retention is resolved.** Send this to support@bolna.ai:
  > Subject: Disabling call recordings / retention for a children's education agent
  > Hi Bolna team — we're building LittleVerse (Bolna Buildathon), a counting tutor for ages 4–6 using the Web Call SDK v3. Our call executions currently store audio recordings and transcripts. Because our users are children: (1) can recording be disabled per agent or account? (2) what is the default retention for recordings and transcripts, and can we set it (e.g. 7 days)? (3) can we delete executions via API? (4) is India data residency available on our plan? Agent id available on request. Thanks!
- **Every mint creates an execution record**, even if the call never connects (we saw zero-length "failed" records from testing).
- **The agent doesn't know when the child taps.** The browser cannot inject messages into a live Bolna call. The prompt has Miko ask the child; true sync needs a Bolna custom function (`check_answer` / `get_lesson_state`) — **post-submission (P1)**, not now.
- **No browser transcripts** from SDK v3.
- **`user_data` substitution is unverified** until §12 step 6 passes.
- **Access code is shared with judges** → anyone with it can spend up to the rate limits. Rotate it after judging (signs everyone out).
- **Browser speech recognition** (the round mic button) sends audio to Google in Chrome; disclosed in the dialog.
- **"Miko" is also an existing Indian kids' AI-robot brand (miko.ai).** Rename planned before the Nov 5–7 interviews. Not a code task for you now.
- **Preview deployments are behind Vercel Authentication** — don't submit a preview URL.
- **Windows:** stopping `npm run dev` from some tools leaves `node` running on the port; check `Get-NetTCPConnection -LocalPort 3000` before rerunning Playwright.
- **Bolna key rotation:** after the buildathon, rotate `BOLNA_API_KEY` (it has lived in local files).

## 14. Git workflow

```bash
git clone https://github.com/Shashank-U-04/Little_Verse.git
cd Little_Verse
git fetch origin
git checkout --no-track -b feat/bolna-backend origin/feat/bolna-primary-voice   # NOT from main
git push -u origin feat/bolna-backend   # first push creates your own remote branch
npm ci
```

- Branch from `feat/bolna-primary-voice`, never from `main` (main lacks all of this work).
- Small commits, one concern each, imperative subject ("Set Upstash env names in docs"). Run lint + tsc + unit tests before each push.
- **Never commit** `.env.local`, keys, codes, `.next/`, `test-results/`. `git status` before every commit.
- No force-pushes, no rewriting shared history, no edits on Developer A's branch (`feat/parent-and-child-ui`).
- Open a PR **`feat/bolna-backend` → `feat/bolna-primary-voice`**. Developer A reviews. Developer A's UI PR targets the same base. When both are merged and §12 passes, the owner opens **`feat/bolna-primary-voice` → `main`** for the production deploy.
- If you need a change in a Developer-A file, describe it in your PR or message them; don't edit it unilaterally.

## 15. Acceptance criteria for your remaining tasks

| Task | Done when |
|---|---|
| Review `a14fe9c`, `7912b05`, adapter | PR comment lists findings (or "no issues"), each with file:line. No unexplained rewrites. |
| Vercel project | Production deployment builds from the agreed branch; build log shows `/api/*` as ƒ Dynamic. |
| Upstash | `/api/voice/status` on the deployment reports `bolnaReady:true`; Upstash console shows `lv:rl:*` keys after a call. |
| Env vars | All §9 required vars set for Production and Preview, secrets marked Sensitive; none use `NEXT_PUBLIC_`; secret scan (§11) prints 0. |
| Bolna dashboard | Owner approved the text; welcome + prompt saved; first spoken line on a call contains the adventure title and current prompt. |
| Session + lesson context | Deployed curl checks in §11 return 403 / 401 as listed; a real call's execution shows the lesson context. |
| Two-way mic test | §12 pass criteria met on desktop Chrome and Android Chrome, with screen recordings. |
| Bolna support | Email sent; reply (or "no reply yet" + date sent) recorded in the PR. |
| Report | PR description uses the template below. |

### Report template (paste into your PR)

```
## Result summary
- Deployed URL:
- Voice two-way test: PASS / FAIL (desktop) · PASS / FAIL (Android)
## Evidence
- Screenshots / recordings: <links>
- Bolna execution ids (no keys): 
- Automated checks: lint / tsc / unit x/31 / e2e x/36 / build
## Findings from code review
## Config changes made (names only, never values)
## Blockers / open questions
## Bolna support: sent <date>, reply: 
```
