# LittleVerse AI

LittleVerse AI is a voice-first, visual learning experience for children aged 3 to 8. Children explore jungle counting adventures with Miko the elephant, earn XP, badges, titles and certificates, and parents see what they actually learned.

## What works

- **Landing page** with a layered rainforest scene (grown trees, palms, lianas and undergrowth that sway and drift with the pointer), the adventures, the level path and a parent preview.
- **Parent accounts** (`/signup`, `/login`) with sign-out in the main navigation. Accounts live in this browser; passwords are salted and hashed with PBKDF2. This is a device-local parent gate, not server-side authentication.
- **Child profile form** (`/onboarding`): name, explorer buddy, age (3–8), hobbies and the areas the parent wants to focus on. The same form edits a profile (`/onboarding?edit=<id>`). A family can have several children; `/profiles` switches between them.
- **Kids Zone** (`/kids`): adventures filtered by the child's age, with the ones matching the parent's focus areas marked "For you", plus XP, level, streak, stars, the level trail and badges.
- **Four playable counting adventures** using Fluent 3D fruit and animal symbols: Jungle Counting (ages 3–5), Fruit Basket Count (4–6), Safari Friends (5–7) and River Count Challenge (6–8, up to ten). Four more modules are listed as coming soon.
- **Levelling up**: XP for every solved challenge (fewer points with more hints), completion, no-hint and first-of-the-day bonuses. Ten titles run from Seedling Scout through Jungle Explorer and Vine Swinger to Jungle Legend, alongside 14 badges, 1–3 stars per adventure and day streaks. A level-up celebration shows on the completion screen, and every title earned unlocks a printable certificate (`/kids/certificate?level=N`). Progression is always recomputed from the saved sessions, so it can never disagree with the parent's evidence.
- **Parent dashboard** (`/parent`): child switcher, profile, level and XP, badges, stars, streak, a suggested next adventure, accuracy chart, skill breakdown and recent activity. `/parent/progress` shows attempt-level evidence; `/parent/settings` manages children, sign-out, voice consent and local data.
- Miko's voice is a live Bolna Web-Call conversation that knows the current lesson. The app, not the AI, decides correctness, hints and progress. Parent consent comes before any voice use; tapping always works without a microphone.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Bolna voice

Copy `.env.example` to `.env.local` and set `BOLNA_API_KEY` and `BOLNA_AGENT_ID` (server-only; never `NEXT_PUBLIC_*`). Locally, the access code is optional and an in-memory rate limiter is used. In production, voice stays off until `DEMO_ACCESS_CODE` and an Upstash Redis REST URL/token are configured. Setup, the API contract and the live-call test are in [`docs/DEVELOPER_HANDOFF.md`](docs/DEVELOPER_HANDOFF.md).

## Scripts

- `npm run dev` — start the development server.
- `npm run lint` — run ESLint.
- `npm run test` — run learning-logic, progression (XP, levels, badges, streaks), profile validation, voice-route, rate-limit and mocked Bolna lifecycle tests with Node’s built-in test runner.
- `npm run test:e2e` — run the Playwright browser suite in desktop and mobile Chromium.
- `npm run build` — create a production build using Next.js Webpack. Webpack is intentional here because the current development environment may not have the native Turbopack binding available.
- `npm run start` — serve the production build.
- `npm run scenery` — regenerate the tree and jungle SVGs in `public/scenery` from `scripts/generate-scenery.ts`. Seeds are fixed, so the output is identical unless you change the script.

### Browser tests

Install the Playwright Chromium browser once, then run the suite:

```bash
npx playwright install chromium
npm run test:e2e
```

The suite starts the Next.js development server automatically. It exercises rendered learning interactions and local session data, with deterministic stubs only for unavailable or denied browser speech recognition.

Latest verified result (31 October 2026): **48/48 browser cases passed** across desktop Chrome and Pixel 5 mobile emulation, including axe checks, consent-before-voice, no automatic device speech while Bolna is selected, and honest voice failure states. A real two-way Bolna call on a deployed URL has **not** been verified yet.

## Routes

- `/` — landing page.
- `/signup`, `/login` — parent account (device-local).
- `/onboarding` — child profile form; `?edit=<id>` edits an existing child.
- `/profiles` — "Who's exploring today?" child picker and link to the parent dashboard.
- `/kids` — the child's dashboard; `/kids/trophies` — badges, titles and stars; `/kids/certificate?level=N` — printable certificate.
- `/adventure/<id>` — an adventure (`jungle-counting`, `fruit-basket`, `safari-friends`, `river-count`); `/adventure/<id>/complete` — results, XP and celebrations.
- `/parent`, `/parent/progress`, `/parent/settings` — parent dashboard, detailed evidence, and family/privacy settings.

The kids' pages and the adventures need a signed-in parent and a child profile; the parent pages need a signed-in parent. Signed-out visitors are sent to `/login`.

## Data and privacy in this prototype

Everything is stored locally in this browser: parent accounts (`littleverse:parents`, with hashed passwords), the signed-in parent (`littleverse:auth`), child profiles (`littleverse:children`, `littleverse:active-child`) and sessions (`littleverse:sessions`, one learner id per child). Removing a child in Settings deletes that child's sessions. LittleVerse stores no audio and no transcripts. During a Miko call, audio is processed by Bolna and its providers (Deepgram, OpenAI, ElevenLabs), and **Bolna keeps call recordings and transcripts** in its execution history; retention is set by Bolna. Chrome's speech recognition (the round mic button) sends audio to Google. Both are disclosed to parents before first use.

The parent sign-in protects a shared device, not data on a server: anyone with access to the browser's storage can read it. Before production, move accounts and profiles to real authentication with server-side authorization (for example Supabase with Row Level Security).

3D symbols in `public/symbols` are Microsoft Fluent Emoji, used under the MIT License (see `public/symbols/LICENSE.txt`).

## Next production steps

1. Add authenticated learner profiles and Supabase persistence.
2. Move session writes behind validated server actions or route handlers.
3. Replace the demo access code with parent authentication, and resolve Bolna recording retention before real children use voice.
4. Extend browser coverage as new learning activities and parent features are added.
5. Add a real parent access gate before exposing learner data.
