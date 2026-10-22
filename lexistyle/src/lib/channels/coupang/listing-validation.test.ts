import assert from "node:assert/strict";
import { test } from "node:test";
import { coupangSearchTags, validateCoupangDocument } from "./listing-validation";

test("search tags reject long phrases, trim and deduplicate without cutting words", () => {
  assert.deepEqual(coupangSearchTags([" 원피스 ", "원피스", "", "a".repeat(20), "a".repeat(21)]), ["원피스", "a".repeat(20)]);
  assert.equal(coupangSearchTags(Array.from({ length: 30 }, (_, i) => String(i))).length, 20);
});

test("document preflight rejects share pages, failed downloads, empty and oversized files", async (t) => {
  const mock = t.mock.method(globalThis, "fetch");
  for (const response of [
    new Response("<html>Drive</html>", { headers: { "content-type": "text/html" } }),
    new Response("denied", { status: 403, headers: { "content-type": "application/pdf" } }),
    new Response(null, { headers: { "content-type": "application/pdf" } }),
    new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { "content-type": "application/pdf" } }),
  ]) {
    mock.mock.mockImplementation(async () => response);
    await assert.rejects(validateCoupangDocument("https://example.com/invoice.pdf"));
  }
  mock.mock.mockImplementation(async () => new Response("%PDF-1.7 test", { headers: { "content-type": "application/pdf" } }));
  await validateCoupangDocument("https://example.com/invoice.pdf");
  await assert.rejects(validateCoupangDocument("http://example.com/invoice.pdf"));
});
