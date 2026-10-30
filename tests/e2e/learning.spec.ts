import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "littleverse:sessions";
const ADVENTURE_PATH = "/adventure/jungle-counting";
const COMPLETE_PATH = "/adventure/jungle-counting/complete";

async function resetLocalData(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Jungle Counting Adventure" })).toBeVisible();
}

async function openAdventure(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Start Adventure", exact: true }).click();
  await expect(page).toHaveURL(/\/adventure\/jungle-counting$/);
  await expect(page.getByRole("heading", { name: /butterflies/i })).toBeVisible();
  await expect(page.getByRole("group", { name: "3 butterflies" })).toBeVisible();
}

async function answer(page: Page, value: number): Promise<void> {
  await page.getByRole("button", { name: `Answer ${value}`, exact: true }).click();
}

async function expectFeedback(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text, { exact: true }).last()).toBeVisible();
}

async function advance(page: Page, last = false): Promise<void> {
  const next = page.getByRole("button", {
    name: last ? "Finish adventure" : "Go to next challenge",
  });
  await expect(next).toBeVisible();
  await next.click();
}

async function completeAdventure(page: Page, answers = [3, 5, 4]): Promise<void> {
  await openAdventure(page);
  await answer(page, answers[0]!);
  await advance(page);
  await expect(page.getByRole("heading", { name: /bananas/i })).toBeVisible();
  await expect(page.getByRole("group", { name: "5 bananas" })).toBeVisible();
  await answer(page, answers[1]!);
  await advance(page);
  await expect(page.getByRole("heading", { name: /elephants/i })).toBeVisible();
  await expect(page.getByRole("group", { name: "4 elephants" })).toBeVisible();
  await answer(page, answers[2]!);
  await advance(page, true);
  await expect(page).toHaveURL(new RegExp(`${COMPLETE_PATH.replaceAll("/", "\\/")}\\?id=`));
  await expect(page.getByRole("heading", { name: "You did it!" })).toBeVisible();
}

async function loadSessions(page: Page): Promise<Array<{ attempts: Array<{ answer: number; isCorrect: boolean; hintLevel: number; challengeId: string }>; status: string }>> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Array<{ attempts: Array<{ answer: number; isCorrect: boolean; hintLevel: number; challengeId: string }>; status: string }>) : [];
  }, STORAGE_KEY);
}

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  // Parent dashboard cards and the home hero fade in; scan their final, visible colors.
  await page.waitForTimeout(700);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, results.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

async function grantVoiceConsent(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.setItem(
    "littleverse:voice-consent",
    JSON.stringify({ version: 1, acceptedAt: "2026-10-31T00:00:00.000Z" }),
  ));
}

async function spyOnDeviceSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { __speechCalls: string[] }).__speechCalls = calls;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => { calls.push(utterance.text); };
    }
  });
}

async function speechCalls(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __speechCalls: string[] }).__speechCalls);
}

test.beforeEach(async ({ page }) => {
  await resetLocalData(page);
});

test("home loads and starts Jungle Counting Adventure", async ({ page }) => {
  await openAdventure(page);
});

test("the three challenges display exactly 3 butterflies, 5 bananas, and 4 elephants", async ({ page }) => {
  await openAdventure(page);
  await expect(page.getByRole("group", { name: "3 butterflies" })).toBeVisible();
  await answer(page, 3);
  await advance(page);
  await expect(page.getByRole("group", { name: "5 bananas" })).toBeVisible();
  await answer(page, 5);
  await advance(page);
  await expect(page.getByRole("group", { name: "4 elephants" })).toBeVisible();
});

test("correct answers advance once and preserve the challenge order", async ({ page }) => {
  await openAdventure(page);
  await page.getByRole("button", { name: "Answer 3", exact: true }).click();
  await expect(page.getByRole("button", { name: "Go to next challenge" })).toBeVisible();

  const sessions = await loadSessions(page);
  expect(sessions).toHaveLength(1);
  expect(sessions[0]?.attempts).toHaveLength(1);
  expect(sessions[0]?.attempts[0]).toMatchObject({ answer: 3, isCorrect: true, challengeId: "c1-butterflies" });

  await advance(page);
  await expect(page.getByRole("heading", { name: /bananas/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /elephants/i })).toHaveCount(0);
});

test("incorrect answers show progressive hints in order", async ({ page }) => {
  await openAdventure(page);
  await answer(page, 2);
  await expectFeedback(page, "Good try! Let's try again.");
  await answer(page, 2);
  await expectFeedback(page, "Let's count together — one, two, three!");
  await answer(page, 2);
  await expectFeedback(page, "See — there are three butterflies. Can you say three?");

  const sessions = await loadSessions(page);
  expect(sessions[0]?.attempts.map((attempt) => attempt.hintLevel)).toEqual([0, 1, 2]);
  expect(sessions[0]?.attempts.every((attempt) => attempt.isCorrect === false)).toBe(true);
});

test("hint and assistance levels are recorded and completion statistics match the session", async ({ page }) => {
  await openAdventure(page);
  await answer(page, 2);
  await answer(page, 2);
  await answer(page, 3);
  await advance(page);
  await answer(page, 5);
  await advance(page);
  await answer(page, 4);
  await advance(page, true);

  await expect(page.getByRole("heading", { name: "You did it!" })).toBeVisible();
  await expect(page.getByText("3/3", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();

  const sessions = await loadSessions(page);
  expect(sessions).toHaveLength(1);
  expect(sessions[0]?.status).toBe("completed");
  expect(sessions[0]?.attempts).toHaveLength(5);
  expect(sessions[0]?.attempts.map((attempt) => attempt.hintLevel)).toEqual([0, 1, 2, 0, 0]);
  expect(sessions[0]?.attempts.filter((attempt) => attempt.isCorrect)).toHaveLength(3);
});

test("demonstration assistance is recorded at the level used for the next answer", async ({ page }) => {
  await openAdventure(page);
  await answer(page, 2);
  await answer(page, 2);
  await expectFeedback(page, "Let's count together — one, two, three!");
  await page.getByRole("button", { name: "See the answer — show me how to count" }).click();
  await expectFeedback(page, "There are 3 butterflies. Let's count — 1, 2, 3! Now you try.");
  await answer(page, 3);

  const sessions = await loadSessions(page);
  expect(sessions[0]?.attempts.map((attempt) => attempt.hintLevel)).toEqual([0, 1, 2]);
  expect(sessions[0]?.attempts.at(-1)).toMatchObject({ answer: 3, isCorrect: true, hintLevel: 2 });
});

test("rapid repeated taps cannot duplicate an attempt or skip a challenge", async ({ page }) => {
  await openAdventure(page);
  const answerButton = page.getByRole("button", { name: "Answer 3", exact: true });
  await answerButton.dblclick({ delay: 0 });
  await expect(page.getByRole("button", { name: "Go to next challenge" })).toBeVisible();

  const sessions = await loadSessions(page);
  expect(sessions[0]?.attempts).toHaveLength(1);
  await advance(page);
  await expect(page.getByRole("heading", { name: /bananas/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /elephants/i })).toHaveCount(0);
});

test("completion handles missing, invalid, and incomplete session data honestly", async ({ page }) => {
  await page.goto(`${COMPLETE_PATH}?id=missing-session`);
  await expect(page.getByRole("heading", { name: "No adventure found" })).toBeVisible();

  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify([{ id: "malformed", status: "completed" }]));
  }, STORAGE_KEY);
  await page.goto(`${COMPLETE_PATH}?id=malformed`);
  await expect(page.getByRole("heading", { name: "No adventure found" })).toBeVisible();

  await page.goto(COMPLETE_PATH);
  await expect(page.getByRole("heading", { name: "No adventure found" })).toBeVisible();
});

test("parent overview uses accurate completed session data and progress has an honest empty state", async ({ page }) => {
  await page.goto("/parent/progress");
  await expect(page.getByRole("heading", { name: "Detailed Progress" })).toBeVisible();
  await expect(page.getByText("No completed progress yet — finish an adventure!", { exact: true })).toBeVisible();

  await page.goto("/");
  await completeAdventure(page);
  await page.goto("/parent");
  await expect(page.getByRole("heading", { name: "Parent Dashboard" })).toBeVisible();
  const completedMetric = page.getByText("Activities Completed", { exact: true }).locator("..");
  await expect(completedMetric.getByText("1", { exact: true })).toBeVisible();
  const accuracyMetric = page.getByText("Avg Accuracy", { exact: true }).locator("..");
  await expect(accuracyMetric.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByText("Sample data", { exact: true })).toHaveCount(0);

  await page.goto("/parent/progress");
  await expect(page.getByRole("heading", { name: "Recent Detailed" })).toBeVisible();
  await expect(page.getByText("3 attempts", { exact: true })).toBeVisible();
});

test("sample parent overview is labelled and navigation works on every important route", async ({ page }) => {
  await page.goto("/parent");
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();

  const routes = [
    "/",
    ADVENTURE_PATH,
    COMPLETE_PATH,
    "/parent",
    "/parent/progress",
    "/parent/settings",
  ];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
  }

  await page.goto("/");
  await page.getByRole("link", { name: "For Parents" }).click();
  await expect(page).toHaveURL(/\/parent$/);
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page).toHaveURL(/\/parent\/progress$/);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/parent\/settings$/);
  await page.getByRole("link", { name: /Explorer/ }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("voice unavailable does not block tap-based learning", async ({ page }) => {
  await page.goto("about:blank");
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
  });
  await resetLocalData(page);
  await openAdventure(page);
  await expect(page.getByRole("button", { name: "Voice unavailable — tap a number instead" })).toBeVisible();
  await answer(page, 3);
  await expect(page.getByRole("button", { name: "Go to next challenge" })).toBeVisible();
});

test("permission denial leaves tap answers available", async ({ page }) => {
  await page.goto("about:blank");
  await page.addInitScript(() => {
    class DeniedRecognition {
      lang = "";
      interimResults = false;
      maxAlternatives = 1;
      continuous = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start(): void {
        this.onerror?.({ error: "not-allowed" });
        this.onend?.();
      }
      stop(): void {
        this.onend?.();
      }
      abort(): void {
        this.onend?.();
      }
    }
    Object.defineProperty(window, "SpeechRecognition", { value: DeniedRecognition, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
    if (navigator.mediaDevices) {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
        configurable: true,
      });
    }
  });
  await resetLocalData(page);
  await grantVoiceConsent(page);
  await openAdventure(page);
  await page.getByRole("button", { name: /activate microphone/i }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Microphone blocked");
  await answer(page, 3);
  await expect(page.getByRole("button", { name: "Go to next challenge" })).toBeVisible();
});

test("keyboard focus, accessible names, and reduced motion keep the adventure usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

  const start = page.getByRole("link", { name: "Start Adventure", exact: true });
  await start.focus();
  await expect(start).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /butterflies/i })).toBeVisible();

  const answerButton = page.getByRole("button", { name: "Answer 3", exact: true });
  await answerButton.focus();
  await expect(answerButton).toBeFocused();
  expect(await answerButton.evaluate((element) => element.className.includes("focus-visible:ring-2"))).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Go to next challenge" })).toBeVisible();
});

test("home, adventure, and parent pages pass automated accessibility checks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Jungle Counting Adventure" })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await openAdventure(page);
  await expectNoAccessibilityViolations(page);
  await page.goto("/parent");
  await expect(page.getByRole("heading", { name: "Parent Dashboard" })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("with Bolna selected, the device voice never speaks on its own", async ({ page }) => {
  await page.goto("about:blank");
  await spyOnDeviceSpeech(page);
  await resetLocalData(page);
  await openAdventure(page);
  await expect(page.getByTestId("tutor-voice-status")).toContainText("Miko's voice");
  await answer(page, 2);
  await expectFeedback(page, "Good try! Let's try again.");
  await answer(page, 3);
  await advance(page);
  await expect(page.getByRole("heading", { name: /bananas/i })).toBeVisible();
  await page.waitForTimeout(800);
  expect(await speechCalls(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Hear again — repeat the question" })).toHaveCount(0);
});

test("the device voice is an explicit, labelled opt-in", async ({ page }) => {
  await page.goto("about:blank");
  await spyOnDeviceSpeech(page);
  await resetLocalData(page);
  await openAdventure(page);
  await page.getByRole("button", { name: "Use device voice instead" }).click();
  await expect(page.getByText("Device voice is on (this device's built-in voice, not Miko's).")).toBeVisible();
  expect(await speechCalls(page)).toEqual(["Look at the butterflies! Can you count them?"]);
  await page.getByRole("button", { name: "Turn device voice off" }).click();
  await answer(page, 2);
  await page.waitForTimeout(600);
  expect(await speechCalls(page)).toEqual(["Look at the butterflies! Can you count them?"]);
});

test("Talk to Miko asks a grown-up for consent before any voice session", async ({ page }) => {
  const sessionRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/bolna-session")) sessionRequests.push(request.url()); });
  await openAdventure(page);
  await page.getByRole("button", { name: "Talk to Miko", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "For grown-ups: before Miko can talk" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Bolna keeps a recording and a transcript of each call");
  await expect(dialog).toContainText("LittleVerse itself stores no audio and no transcripts.");
  await expect(dialog.getByRole("button", { name: "Agree and turn on voice" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect(dialog).toHaveCount(0);
  expect(sessionRequests).toEqual([]);
  await answer(page, 3);
  await expect(page.getByRole("button", { name: "Go to next challenge" })).toBeVisible();
});

test("a failed Miko connection is reported honestly and tapping keeps working", async ({ page }) => {
  await page.route("**/api/bolna-session", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Voice is off", code: "rate_limit_store_missing" }),
  }));
  await grantVoiceConsent(page);
  await openAdventure(page);
  await page.getByRole("button", { name: "Talk to Miko", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "isn't set up here yet" })).toBeVisible();
  await expect(page.getByTestId("tutor-voice-status")).toContainText("not connected");
  await expect(page.getByTestId("tutor-voice-status")).not.toContainText("Live");
  await answer(page, 3);
  await expect(page.getByRole("button", { name: "Go to next challenge" })).toBeVisible();
});
