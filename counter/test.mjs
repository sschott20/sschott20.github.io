// Tests for the visit counter worker. Run with `node test.mjs` (no deps).
//
// The KV binding is mocked in memory; everything else is the real worker.
import assert from "node:assert/strict";
import worker from "./src/index.js";

const SITE = "https://sschott20.github.io";
const CHROME =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function mockEnv() {
  const store = new Map();
  return {
    store,
    COUNTER: {
      async get(k) {
        return store.has(k) ? store.get(k) : null;
      },
      async put(k, v) {
        store.set(k, v);
      },
      async list({ prefix }) {
        const keys = [...store.keys()]
          .filter((k) => k.startsWith(prefix))
          .map((name) => ({ name }));
        return { keys };
      },
    },
  };
}

function post(path, body, { origin = SITE, ua = CHROME, country = "US" } = {}) {
  const req = new Request("https://site-counter.example" + path, {
    method: "POST",
    headers: { Origin: origin, "User-Agent": ua },
    body: JSON.stringify(body),
  });
  req.cf = { country };
  return req;
}

const hit = (env, body, opts) => worker.fetch(post("/hit", body, opts), env);
const refKeys = (env) => [...env.store.keys()].filter((k) => k.startsWith("ref:"));

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log("  ok   " + name);
  } catch (e) {
    failed++;
    console.log("  FAIL " + name + "\n       " + e.message);
  }
}

console.log("referrer dimension");

await test("empty referrer is recorded as (direct), not dropped", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "", n: true });
  assert.equal(env.store.get("ref:(direct)"), "1");
});

await test("external referrer is recorded as origin + path", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "https://www.google.com/", n: true });
  assert.equal(env.store.get("ref:https://www.google.com/"), "1");
  assert.deepEqual(refKeys(env), ["ref:https://www.google.com/"]);
});

await test("referrer query and fragment are stripped", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "https://news.ycombinator.com/item?id=1#c2", n: true });
  assert.deepEqual(refKeys(env), ["ref:https://news.ycombinator.com/item"]);
});

await test("internal navigation is not counted as a referrer or as direct", async () => {
  const env = mockEnv();
  await hit(env, { p: "/trees/", r: SITE + "/", n: false });
  assert.deepEqual(refKeys(env), []);
  assert.equal(env.store.get("visits"), "1");
});

await test("app-scheme referrer keeps its scheme instead of becoming 'null'", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "android-app://com.linkedin.android/", n: true });
  assert.deepEqual(refKeys(env), ["ref:android-app://com.linkedin.android/"]);
});

await test("unparseable referrer does not lose the visit", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "not a url", n: true });
  assert.deepEqual(refKeys(env), []);
  assert.equal(env.store.get("visits"), "1");
});

console.log("client dimension");

await test("browser family is recorded once per unique visit", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "", n: true });
  assert.equal(env.store.get("client:Chrome"), "1");
});

await test("repeat visit same day does not re-count the client", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "", n: false });
  assert.equal(env.store.get("client:Chrome"), undefined);
  assert.equal(env.store.get("visits"), "1");
});

await test("headless and scripted clients bucket as automated", async () => {
  for (const ua of [
    "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0 Safari/537.36",
    "python-requests/2.31.0",
    "curl/8.5.0",
    "Mozilla/5.0 (compatible; SomeCrawler/1.0; +http://example.com/bot)",
  ]) {
    const env = mockEnv();
    await hit(env, { p: "/", r: "", n: true }, { ua });
    assert.equal(env.store.get("client:automated"), "1", "not bucketed as automated: " + ua);
  }
});

await test("chromium-based browsers are told apart", async () => {
  const cases = [
    ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0", "Edge"],
    ["Mozilla/5.0 (X11; Linux) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0", "Opera"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0", "Firefox"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) AppleWebKit/605.1.15 Version/17.2 Mobile/15E148 Safari/604.1", "Safari"],
    [CHROME, "Chrome"],
  ];
  for (const [ua, want] of cases) {
    const env = mockEnv();
    await hit(env, { p: "/", r: "", n: true }, { ua });
    assert.equal(env.store.get("client:" + want), "1", ua + " -> expected " + want);
  }
});

await test("a phone brand containing 'bot' is not called automated", async () => {
  const env = mockEnv();
  const ua = "Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
  await hit(env, { p: "/", r: "", n: true }, { ua });
  assert.equal(env.store.get("client:Chrome"), "1");
});

console.log("tagged source dimension");

await test("?src= tag is recorded as its own dimension", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "", n: true, s: "linkedin" });
  assert.equal(env.store.get("src:linkedin"), "1");
  // a tag never masquerades as a browser-reported referrer
  assert.deepEqual(refKeys(env), ["ref:(direct)"]);
});

await test("tag is counted on repeat visits too, not just the first of the day", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "", n: false, s: "linkedin" });
  assert.equal(env.store.get("src:linkedin"), "1");
});

await test("tag is lowercased so LinkedIn and linkedin are one row", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "", n: true, s: "LinkedIn" });
  await hit(env, { p: "/", r: "", n: true, s: "linkedin" });
  assert.equal(env.store.get("src:linkedin"), "2");
});

await test("junk tags are rejected", async () => {
  for (const s of ["", "a".repeat(25), "has space", "../evil", "<script>", 5, null]) {
    const env = mockEnv();
    await hit(env, { p: "/", r: "", n: true, s });
    const keys = [...env.store.keys()].filter((k) => k.startsWith("src:"));
    assert.deepEqual(keys, [], "accepted junk tag: " + JSON.stringify(s));
  }
});

console.log("existing behaviour still holds");

await test("visits, day, page and country are still counted", async () => {
  const env = mockEnv();
  await hit(env, { p: "/trees/", r: "", n: true }, { country: "JP" });
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(env.store.get("visits"), "1");
  assert.equal(env.store.get("day:" + today), "1");
  assert.equal(env.store.get("uniq:" + today), "1");
  assert.equal(env.store.get("page:/trees/"), "1");
  assert.equal(env.store.get("country:JP"), "1");
});

await test("a hit from another origin writes nothing", async () => {
  const env = mockEnv();
  const res = await hit(env, { p: "/", r: "https://evil.example/", n: true }, { origin: "https://evil.example" });
  assert.equal(res.status, 204);
  assert.equal(env.store.size, 0);
});

await test("link clicks are still counted", async () => {
  const env = mockEnv();
  await worker.fetch(post("/click", { href: "https://arxiv.org/abs/1#x" }), env);
  assert.equal(env.store.get("link:https://arxiv.org/abs/1"), "1");
});

console.log("stats endpoint");

await test("/stats exposes refs including (direct), srcs and clients", async () => {
  const env = mockEnv();
  await hit(env, { p: "/", r: "", n: true, s: "linkedin" });
  await hit(env, { p: "/", r: "https://www.google.com/", n: true });
  const res = await worker.fetch(
    new Request("https://site-counter.example/stats", { method: "GET" }),
    env
  );
  const s = await res.json();
  assert.equal(s.total, 2);
  assert.deepEqual(s.refs.sort(), [
    ["(direct)", 1],
    ["https://www.google.com/", 1],
  ]);
  assert.deepEqual(s.srcs, [["linkedin", 1]]);
  assert.deepEqual(s.clients, [["Chrome", 2]]);
});

console.log(failed ? "\n" + failed + " test(s) failed" : "\nall tests passed");
process.exit(failed ? 1 : 0);
