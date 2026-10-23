import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import handler from "../api/support.js";

const originalKey = process.env.RESEND_API_KEY;
const originalFetch = globalThis.fetch;
const valid = {
  nombre: "Ana Pérez",
  email: "ana@example.com",
  negocio: "Café Centro",
  asunto: "Falta un sello",
  mensaje: "Mi visita de hoy no aparece en la tarjeta.",
};

afterEach(() => {
  if (originalKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalKey;
  globalThis.fetch = originalFetch;
});

async function request(body, method = "POST") {
  const res = {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  await handler({ method, body }, res);
  return res;
}

test("only accepts POST", async () => {
  const res = await request(valid, "GET");
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "POST");
});

test("rejects incomplete, malformed and invalid requests without sending email", async () => {
  globalThis.fetch = () => { throw new Error("Must not send email"); };
  for (const body of [undefined, "{", [], {}, { ...valid, email: "invalid" },
    { ...valid, nombre: "   " }, { ...valid, asunto: "" }, { ...valid, mensaje: "" }]) {
    const res = await request(body);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
  }
});

test("honeypot requests never send email", async () => {
  globalThis.fetch = () => { throw new Error("Must not send email"); };
  const res = await request({ ...valid, company: "spam" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});

test("missing mail configuration returns failure", async (t) => {
  delete process.env.RESEND_API_KEY;
  t.mock.method(console, "error", () => {});
  const res = await request(valid);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
});

test("sends support details with customer reply address and escaped HTML", async () => {
  process.env.RESEND_API_KEY = "re_test_not_real";
  let sent;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: "mock-email-id" }), { status: 200 });
  };
  const res = await request(JSON.stringify({ ...valid, mensaje: '<script>alert("x")</script> & ayuda' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(sent.reply_to, valid.email);
  assert.deepEqual(sent.to, (process.env.SUPPORT_TO_EMAIL || "support@vuelveclub.com").split(',').map(x=>x.trim()));
  assert.ok(sent.subject.includes(valid.asunto));
  assert.ok(sent.text.includes(valid.negocio));
  assert.ok(sent.html.includes("&lt;script&gt;"));
  assert.ok(!sent.html.includes("<script>"));
});

test("provider rejection and network failures never report success", async (t) => {
  process.env.RESEND_API_KEY = "re_test_not_real";
  t.mock.method(console, "error", () => {});
  for (const failure of [
    async () => new Response(JSON.stringify({ name: "validation_error", message: "Rejected" }), { status: 422 }),
    async () => { throw new Error("Network unavailable"); },
  ]) {
    globalThis.fetch = failure;
    const res = await request(valid);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.ok, false);
  }
});
