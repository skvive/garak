import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { validateSlots, selectItems } from "./validation";
import { slotForProduct } from "./dressable";
import { signJob, verifyJob } from "./job-ticket";
import { normalizePortrait, checkOrigin } from "./photo";
import { createVtoJob, getVtoJob, outfitPrompt } from "./vto";
import type { DressableItem } from "./types";
const item = (slot: DressableItem["slot"]): DressableItem => ({ slug: slot, name: slot, brand: "LEXI", price: 20, discountRate: 0, slot, image: `https://example.com/${slot}.jpg`, cutoutUrl: "", dressable: true });

test("reject malformed/conflicting/unknown slots and category mismatches", () => {
  for (const value of [null, [], { dress: "a", top: "b" }, { wrong: "a" }, { top: 5 }]) assert.throws(() => validateSlots(value));
  assert.throws(() => selectItems({ shoes: "bag" }, [item("bag")]));
  assert.deepEqual(validateSlots({ top: "a", bag: "b", shoes: "c" }), { top: "a", bag: "b", shoes: "c" });
});
test("real catalog classification includes bags, shoes, Korean titles", () => {
  for (const [name, category, expected] of [["Leather Crossbody Bag", "bags-shoes", "bag"], ["가죽 스니커즈", "shoes", "shoes"], ["니트 가디건", "women-tops", "outer"]]) {
    assert.equal(slotForProduct({ slug: "real", name, category, brand: "LEXI", price: 1, discountRate: 0, rating: 0, reviewCount: 0, image: "" }), expected);
  }
});
test("job access requires correct owner, signature and unexpired token across instances", () => {
  process.env.LOOKS_SIGNING_SECRET = "test-only-long-key";
  const ticket = { id: "test-job", owner: "a", exp: Date.now() + 10000 };
  const signed = signJob(ticket);
  assert.deepEqual(verifyJob(signed, "a"), ticket);
  assert.throws(() => verifyJob(signed, "b"));
  assert.throws(() => verifyJob(signed + "tampered", "a"));
  assert.throws(() => verifyJob(signJob({ ...ticket, exp: 0 }), "a"));
});
test("portrait processing rejects invalid inputs and removes embedded metadata", async () => {
  await assert.rejects(normalizePortrait(new File(["<svg></svg>"], "x.svg", { type: "image/svg+xml" })));
  await assert.rejects(normalizePortrait(new File(["broken"], "x.jpg", { type: "image/jpeg" })));
  const image = await sharp({ create: { width: 480, height: 640, channels: 3, background: "white" } }).withMetadata().jpeg().toBuffer();
  const data = await normalizePortrait(new File([new Uint8Array(image)], "photo.jpg", { type: "image/jpeg" }));
  const meta = await sharp(Buffer.from(data.split(",")[1], "base64")).metadata();
  assert.equal(meta.exif, undefined); assert.equal(meta.width, 480);
  assert.throws(() => checkOrigin(new Request("https://lexi.example/api/vto", { headers: { origin: "https://evil.example" } })));
});
test("submit every selected garment with face first; failed and empty results stay failed", async () => {
  process.env.WAN_API_KEY = "test-only";
  const original = globalThis.fetch;
  let captured: Record<string, any> = {};
  try {
    globalThis.fetch = async (_url, init) => { captured = JSON.parse(String(init?.body)); return Response.json({ output: { task_id: "test-id" } }); };
    const items = [item("top"), item("bottom"), item("bag"), item("shoes")];
    const job = await createVtoJob({ modelImage: "data:image/jpeg;base64,face", items, occasion: "일상" });
    assert.equal(job.status, "queued"); assert.equal(job.outputUrl, null);
    assert.equal(captured.input.messages[0].content.filter((c: {image?: string}) => c.image).length, 5);
    assert.match(outfitPrompt(items, "일상"), /Image 5: shoes/);
    globalThis.fetch = async () => Response.json({ output: { task_status: "FAILED" } });
    assert.equal((await getVtoJob("test-id")).status, "failed");
    globalThis.fetch = async () => Response.json({ output: { task_status: "SUCCEEDED", results: [] } });
    assert.equal((await getVtoJob("test-id")).status, "failed");
  } finally { globalThis.fetch = original; }
});
