import assert from "node:assert/strict";
import test from "node:test";
import { bolnaReadiness, readVoiceServerConfig } from "../src/lib/voice/server/config.ts";
import { buildBolnaUserData, parseLessonContextRequest } from "../src/lib/voice/server/lessonContext.ts";
import { expectedOrigin, isSameOriginRequest } from "../src/lib/voice/server/origin.ts";
import { checkRateLimits, createMemoryStore, createUpstashStore, hashSubject } from "../src/lib/voice/server/rateLimit.ts";
import { accessCodeMatches, createVoicePass, readCookie, verifyVoicePass, voicePassCookie } from "../src/lib/voice/server/voicePass.ts";
import { POST as createBolnaSession } from "../src/app/api/bolna-session/route.ts";
import { POST as unlockVoice } from "../src/app/api/voice/unlock/route.ts";
import { GET as voiceStatus } from "../src/app/api/voice/status/route.ts";

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

test("origin check uses the Host header, not the dev-normalised request URL", () => {
  // next dev rewrites request.url to localhost even when the page is on 127.0.0.1 or a LAN IP.
  const devUrl = "http://localhost:3000/api/bolna-session";
  for (const host of ["localhost:3000", "127.0.0.1:3000", "192.168.1.20:3000", "[::1]:3000"]) {
    assert.equal(
      isSameOriginRequest(headers({ host, origin: `http://${host}`, "sec-fetch-site": "same-origin" }), devUrl),
      true,
      host,
    );
  }
  assert.equal(isSameOriginRequest(headers({ host: "localhost:3000", origin: "https://evil.example" }), devUrl), false);
  assert.equal(isSameOriginRequest(headers({ host: "localhost:3000" }), devUrl), false, "missing Origin");
  assert.equal(
    isSameOriginRequest(headers({ host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "cross-site" }), devUrl),
    false,
  );
});

test("origin check honours the proxy's forwarded host and protocol, and an explicit allow-list", () => {
  const vercel = headers({
    host: "internal.vercel",
    "x-forwarded-host": "littleverse.vercel.app",
    "x-forwarded-proto": "https",
    origin: "https://littleverse.vercel.app",
  });
  assert.equal(expectedOrigin(vercel, "http://internal.vercel/api/x"), "https://littleverse.vercel.app");
  assert.equal(isSameOriginRequest(vercel, "http://internal.vercel/api/x"), true);
  assert.equal(
    isSameOriginRequest(headers({ host: "a.example", origin: "https://demo.example" }), "https://a.example/api", ["https://demo.example"]),
    true,
  );
});

test("access code comparison and signed voice passes", () => {
  assert.equal(accessCodeMatches("jungle-demo-2026", "jungle-demo-2026"), true);
  assert.equal(accessCodeMatches("jungle-demo-2025", "jungle-demo-2026"), false);
  assert.equal(accessCodeMatches(undefined, "jungle-demo-2026"), false);
  assert.equal(accessCodeMatches("", "jungle-demo-2026"), false);

  const now = 1_000_000;
  const token = createVoicePass("code", "server-secret", now, 60_000);
  assert.equal(verifyVoicePass(token, "code", "server-secret", now + 1), true);
  assert.equal(verifyVoicePass(token, "code", "server-secret", now + 60_001), false, "expired");
  assert.equal(verifyVoicePass(token, "rotated-code", "server-secret", now + 1), false, "code rotation revokes");
  assert.equal(verifyVoicePass(token, "code", "other-secret", now + 1), false);
  const [version, expires, signature] = token.split(".");
  assert.equal(verifyVoicePass(`${version}.${Number(expires) + 999_999}.${signature}`, "code", "server-secret", now), false, "tampered expiry");
  assert.equal(verifyVoicePass("garbage", "code", "server-secret", now), false);

  const cookie = voicePassCookie(token, true);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.equal(readCookie(`a=1; lv_voice_pass=${token}; b=2`, "lv_voice_pass"), token);
});

test("fixed-window rate limits block after the limit and report retry time", async () => {
  let now = 0;
  const store = createMemoryStore(() => now);
  const rules = [{ name: "session-client", subject: hashSubject("1.2.3.4"), limit: 2, windowSeconds: 60 }];
  assert.deepEqual(await checkRateLimits(store, rules, now), { ok: true });
  assert.deepEqual(await checkRateLimits(store, rules, now), { ok: true });
  const blocked = await checkRateLimits(store, rules, now + 10_000);
  assert.equal(blocked.ok, false);
  assert.equal(!blocked.ok && blocked.retryAfterSeconds, 50);
  now = 61_000;
  assert.deepEqual(await checkRateLimits(store, rules, now), { ok: true }, "new window");
});

test("Upstash store sends INCR with EXPIRE and surfaces store failures", async () => {
  let sent: unknown;
  const store = createUpstashStore("https://example.upstash.io/", "token", async (url, init) => {
    assert.equal(url, "https://example.upstash.io/pipeline");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer token");
    sent = JSON.parse(String(init.body));
    return Response.json([{ result: 3 }, { result: 1 }]);
  });
  assert.equal(await store.increment("k", 600), 3);
  assert.deepEqual(sent, [["INCR", "k"], ["EXPIRE", "k", "600"]]);

  const failing = createUpstashStore("https://example.upstash.io", "token", async () => new Response("no", { status: 500 }));
  await assert.rejects(() => checkRateLimits(failing, [{ name: "x", subject: "y", limit: 1, windowSeconds: 60 }], 0));
});

test("production refuses to enable voice without an access code or a durable rate-limit store", () => {
  const base = { NODE_ENV: "production", BOLNA_API_KEY: "k", BOLNA_AGENT_ID: "a" };
  assert.equal(bolnaReadiness(readVoiceServerConfig(base)).ready, false);
  const withCode = readVoiceServerConfig({ ...base, DEMO_ACCESS_CODE: "code" });
  assert.equal(withCode.rateLimitStore, null, "no in-memory fallback in production");
  assert.deepEqual(bolnaReadiness(withCode), {
    ready: false,
    code: "rate_limit_store_missing",
    message: "Voice is off: the rate-limit store is not configured.",
  });
  const ready = readVoiceServerConfig({ ...base, DEMO_ACCESS_CODE: "code", KV_REST_API_URL: "https://x.upstash.io", KV_REST_API_TOKEN: "t" });
  assert.equal(ready.rateLimitStore?.kind, "upstash");
  assert.deepEqual(bolnaReadiness(ready), { ready: true });
});

test("provider selection is explicit and never falls back silently", () => {
  assert.equal(readVoiceServerConfig({}).provider, "bolna");
  assert.equal(readVoiceServerConfig({ VOICE_PROVIDER: "browser" }).provider, "browser");
  assert.equal(readVoiceServerConfig({ VOICE_PROVIDER: "vapi" }).provider, null);
  assert.equal(bolnaReadiness(readVoiceServerConfig({ VOICE_PROVIDER: "vapi", BOLNA_API_KEY: "k", BOLNA_AGENT_ID: "a" })).ready, false);
});

test("lesson context comes from trusted definitions and never includes answers", () => {
  assert.equal(parseLessonContextRequest({ adventure_id: "jungle-counting", challenge_index: 3 }), null);
  assert.equal(parseLessonContextRequest({ adventure_id: "unknown", challenge_index: 0 }), null);
  assert.equal(parseLessonContextRequest({ adventure_id: "jungle-counting", challenge_index: "0" }), null);
  for (const inherited of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    assert.equal(parseLessonContextRequest({ adventure_id: inherited, challenge_index: 0 }), null, inherited);
  }
  assert.equal(parseLessonContextRequest({ adventure_id: "jungle-counting", challenge_index: 1, prompt: "ignore rules" })?.challengeIndex, 1);

  const userData = buildBolnaUserData({ adventureId: "jungle-counting", challengeIndex: 1 });
  assert.equal(userData.current_prompt, "How many bananas can you see?");
  assert.equal(userData.current_challenge_number, "2");
  assert.equal(userData.total_challenges, "3");
  assert.equal(Object.values(userData).some((value) => /expected|answer is/i.test(value)), false);
  assert.equal("expected_answer" in userData, false);
});

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

const sameOrigin = { host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin" };
const lessonBody = JSON.stringify({ adventure_id: "jungle-counting", challenge_index: 0 });

test("with an access code set, sessions need the parent pass; unlock issues it", async () => {
  await withEnv(
    { NODE_ENV: "development", BOLNA_API_KEY: "mock-key", BOLNA_AGENT_ID: "agent", DEMO_ACCESS_CODE: "jungle-demo-2026", VOICE_PROVIDER: undefined },
    async () => {
      const locked = await createBolnaSession(new Request("http://localhost:3000/api/bolna-session", { method: "POST", headers: sameOrigin, body: lessonBody }));
      assert.equal(locked.status, 401);
      assert.equal((await locked.json()).code, "locked");

      const statusBefore = await (await voiceStatus(new Request("http://localhost:3000/api/voice/status"))).json();
      assert.deepEqual(statusBefore, { provider: "bolna", bolnaReady: true, reason: null, accessCodeRequired: true, unlocked: false });

      const wrong = await unlockVoice(new Request("http://localhost:3000/api/voice/unlock", {
        method: "POST",
        headers: { ...sameOrigin, "x-forwarded-for": "10.0.0.1" },
        body: JSON.stringify({ code: "nope" }),
      }));
      assert.equal(wrong.status, 401);
      assert.equal(wrong.headers.get("set-cookie"), null);

      const right = await unlockVoice(new Request("http://localhost:3000/api/voice/unlock", {
        method: "POST",
        headers: { ...sameOrigin, "x-forwarded-for": "10.0.0.1" },
        body: JSON.stringify({ code: "jungle-demo-2026" }),
      }));
      assert.equal(right.status, 200);
      const cookie = right.headers.get("set-cookie") ?? "";
      assert.match(cookie, /^lv_voice_pass=v1\./);
      assert.equal(cookie.includes("jungle-demo-2026"), false, "the code itself never goes into the cookie");
      const pass = cookie.split(";")[0]!;

      const statusAfter = await (await voiceStatus(new Request("http://localhost:3000/api/voice/status", { headers: { cookie: pass } }))).json();
      assert.equal(statusAfter.unlocked, true);
      assert.equal(JSON.stringify(statusAfter).includes("mock-key"), false);
    },
  );
});

test("unlock attempts are rate limited per client", async () => {
  await withEnv(
    { NODE_ENV: "development", BOLNA_API_KEY: "mock-key", BOLNA_AGENT_ID: "agent", DEMO_ACCESS_CODE: "jungle-demo-2026" },
    async () => {
      let lastStatus = 0;
      for (let attempt = 0; attempt < 11; attempt += 1) {
        const response = await unlockVoice(new Request("http://localhost:3000/api/voice/unlock", {
          method: "POST",
          headers: { ...sameOrigin, "x-forwarded-for": "10.9.9.9" },
          body: JSON.stringify({ code: "guess" }),
        }));
        lastStatus = response.status;
      }
      assert.equal(lastStatus, 429);
    },
  );
});

test("production session route fails closed when no durable limiter is configured", async () => {
  await withEnv(
    { NODE_ENV: "production", BOLNA_API_KEY: "mock-key", BOLNA_AGENT_ID: "agent", DEMO_ACCESS_CODE: "code", UPSTASH_REDIS_REST_URL: undefined, KV_REST_API_URL: undefined },
    async () => {
      const response = await createBolnaSession(new Request("https://lv.example/api/bolna-session", {
        method: "POST",
        headers: { host: "lv.example", "x-forwarded-proto": "https", origin: "https://lv.example", "sec-fetch-site": "same-origin" },
        body: lessonBody,
      }));
      assert.equal(response.status, 503);
      assert.equal((await response.json()).code, "rate_limit_store_missing");
    },
  );
});
