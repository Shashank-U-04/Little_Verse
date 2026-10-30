# LittleVerse AI

LittleVerse AI is a voice-first, visual learning experience for young children. The first vertical slice is **Jungle Counting Adventure**, a 3–5 minute counting activity guided by Miko the elephant.

## What works in this MVP

- Illustrated explorer home with a responsive jungle scene and Miko.
- Three deterministic counting challenges: butterflies, bananas, and elephants.
- Tap-to-answer fallback with large, accessible controls.
- Progressive encouragement and hints after incorrect responses.
- Interactive countable objects that children can tap one at a time.
- Honest voice states using browser speech recognition where available, with a clear fallback when unavailable.
- Browser speech synthesis for spoken prompts and feedback.
- Optional Miko live conversation through the Bolna Web-Call SDK; answer capture and learning decisions remain in LittleVerse.
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

### Optional Bolna voice conversation

To enable local voice conversations, create `.env.local` in the project root and set the server-only `BOLNA_API_KEY` and `BOLNA_AGENT_ID` variables. Keep the API key out of browser-prefixed variables such as `NEXT_PUBLIC_*`, source files, logs, and Git. Restart the development server after configuring the variables. The session route is intentionally disabled in production until parent authentication and route authorization are implemented.

## Scripts

- `npm run dev` — start the development server.
- `npm run lint` — run ESLint.
- `npm run test` — run learning-logic and mocked Bolna lifecycle tests with Node’s built-in test runner.
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

Latest verified result (21 October 2026): **28/28 browser cases passed** across desktop Chrome and Pixel 5 mobile emulation. Axe checks passed for the home, adventure, and parent dashboard; keyboard focus, reduced motion, challenge progression, attempts, completion, parent states, route navigation, and voice fallback were exercised.

## Routes

- `/` — child-facing explorer home.
- `/adventure/jungle-counting` — the counting adventure.
- `/adventure/jungle-counting/complete` — structured session summary.
- `/parent` — parent overview.
- `/parent/progress` — session and attempt-level progress evidence.
- `/parent/settings` — local preferences, privacy, and data deletion.

## Data and privacy in this prototype

Session data is stored locally in the browser under `littleverse:sessions`. No raw voice recordings are retained by this app. Browser speech recognition is used for answer capture where available; Bolna provides a separate live conversation and does not submit answers or determine correctness. The app does not consume a Bolna transcript. Browser speech recognition and speech synthesis are optional and device-dependent; the visual flow always remains usable without them.

The parent routes are prototype routes and are not protected by authentication yet. Before production, add parent authentication, server-side authorization, Supabase Row Level Security, consent/onboarding, retention/deletion workflows, and a verified Bolna server-side adapter.

## Next production steps

1. Add authenticated learner profiles and Supabase persistence.
2. Move session writes behind validated server actions or route handlers.
3. Add parent authentication and authorization to the Bolna session route before enabling it in production.
4. Extend browser coverage as new learning activities and parent features are added.
5. Add a real parent access gate before exposing learner data.
