const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret-test-secret";
process.env.NODE_ENV = "test";

const jwt = require("jsonwebtoken");
const app = require("../server");
const rateLimit = require("../utils/rateLimit");

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => server.close());

test("health endpoint responds", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("security headers are set and x-powered-by is removed", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("unknown API route returns JSON 404", async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "NOT_FOUND");
});

test("protected routes reject missing and invalid tokens", async () => {
  for (const path of ["/api/tasks", "/api/goals", "/api/analytics/summary", "/api/focus", "/api/auth/me"]) {
    const none = await fetch(`${base}${path}`);
    assert.equal(none.status, 401, path);

    const bad = await fetch(`${base}${path}`, { headers: { Authorization: "Bearer garbage" } });
    assert.equal(bad.status, 401, path);
  }
});

test("an expired token is rejected", async () => {
  const token = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET, { expiresIn: -10 });
  const res = await fetch(`${base}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 401);
});

test("malformed JSON returns 400 instead of a stack trace", async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad json",
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "INVALID_JSON");
});

test("register validates input before touching the database", async () => {
  const post = (body) =>
    fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  assert.equal((await post({})).status, 400);
  assert.equal((await post({ name: "A", email: "not-an-email", password: "password123" })).status, 400);
  assert.equal((await post({ name: "A", email: "a@b.co", password: "short" })).status, 400);
});

test("invalid query parameters are rejected with 400 (valid token, no DB needed)", async () => {
  const token = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
  const headers = { Authorization: `Bearer ${token}` };

  for (const query of ["date=2026-13-45", "status=Bogus", "priority=Urgent", "category=Nope", "startDate=x"]) {
    const res = await fetch(`${base}/api/tasks?${query}`, { headers });
    assert.equal(res.status, 400, query);
  }

  const badId = await fetch(`${base}/api/tasks/not-an-id`, { headers });
  assert.equal(badId.status, 400);
});

test("rate limiter blocks after the configured maximum", () => {
  const limiter = rateLimit({ windowMs: 1000, max: 2 });
  const calls = [];
  const makeRes = () => ({
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  });
  const req = { ip: "1.2.3.4" };

  for (let i = 0; i < 3; i += 1) {
    const res = makeRes();
    limiter(req, res, () => calls.push("next"));
    if (i === 2) assert.equal(res.code, 429);
  }
  assert.equal(calls.length, 2);
});
