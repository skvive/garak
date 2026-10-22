import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeStorefrontHtml } from "./storefront";

test("removes HQ-only Ruleset metadata from storefront HTML", () => {
  const html = "<table><tr><th>Brand</th><td>LEXI</td></tr><tr><th>Ruleset</th><td>internal-v1</td></tr></table>";
  const sanitized = sanitizeStorefrontHtml(html);
  assert.match(sanitized, /Brand/);
  assert.doesNotMatch(sanitized, /Ruleset|internal-v1/);
});
