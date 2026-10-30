# LittleVerse AI

LittleVerse AI is a voice-first, visual learning experience for young children. The first vertical slice is **Jungle Counting Adventure**, a 3–5 minute counting activity guided by Miko the elephant.

## What works in this MVP

- Illustrated explorer home with a responsive jungle scene and Miko.
- Three deterministic counting challenges: butterflies, bananas, and elephants.
- Tap-to-answer fallback with large, accessible controls.
- Progressive encouragement and hints after incorrect responses.
- Interactive countable objects that children can tap one at a time.
- Miko's voice is a live Bolna Web-Call conversation that knows the current lesson. The app, not the AI, decides correctness, hints and progress.
- Parent disclosure and consent before any voice use; a demo access code and durable rate limits protect the public voice route.
- The device's built-in voice is only an explicit, labelled opt-in; browser speech recognition remains available for spoken answers.
- Completion summary with validated attempts, hint levels, skills, and accuracy.
- Parent overview and detailed progress routes using Recharts.
- Local prototype persistence in `localStorage`, plus a clearly labelled sample-data fallback when no session exists.
- Parent settings page with local data deletion and safety/privacy notes.

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
- `npm run test` — run learning-logic, voice-route, rate-limit and mocked Bolna lifecycle tests with Node’s built-in test runner.
- `npm run test:e2e` — run the Playwright browser suite in desktop and mobile Chromium.
- `npm run build` — create a production build using Next.js Webpack. Webpack is intentional here because the current development environment may not have the native Turbopack binding available.
- `npm run start` — serve the production build.

### Browser tests

Install the Playwright Chromium browser once, then run the suite:

```bash
npx playwright install chromium
npm run test:e2e
```

The suite starts the Next.js development server automatically. It exercises rendered learning interactions and local session data, with deterministic stubs only for unavailable or denied browser speech recognition.

Latest verified result (30 October 2026): **36/36 browser cases passed** across desktop Chrome and Pixel 5 mobile emulation, including axe checks, consent-before-voice, no automatic device speech while Bolna is selected, and honest voice failure states. A real two-way Bolna call on a deployed URL has **not** been verified yet.

## Routes

- `/` — child-facing explorer home.
- `/adventure/jungle-counting` — the counting adventure.
- `/adventure/jungle-counting/complete` — structured session summary.
- `/parent` — parent overview.
- `/parent/progress` — session and attempt-level progress evidence.
- `/parent/settings` — local preferences, privacy, and data deletion.

## Data and privacy in this prototype

Session data is stored locally in the browser under `littleverse:sessions`. LittleVerse stores no audio and no transcripts. During a Miko call, audio is processed by Bolna and its providers (Deepgram, OpenAI, ElevenLabs), and **Bolna keeps call recordings and transcripts** in its execution history; retention is set by Bolna. Chrome's speech recognition (the round mic button) sends audio to Google. Both are disclosed to parents before first use. Tapping always works without voice.

The parent routes are prototype routes and are not protected by authentication yet. Before production, add parent authentication, server-side authorization, Supabase Row Level Security, consent/onboarding, retention/deletion workflows, and a verified Bolna server-side adapter.

## Next production steps

1. Add authenticated learner profiles and Supabase persistence.
2. Move session writes behind validated server actions or route handlers.
3. Replace the demo access code with parent authentication, and resolve Bolna recording retention before real children use voice.
4. Extend browser coverage as new learning activities and parent features are added.
5. Add a real parent access gate before exposing learner data.
