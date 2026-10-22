import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { catalogIndex, contentDocuments, productImages } from "../src/db/schema";
import { getSample3BatchOverride } from "../src/lib/pdp/sample3-batch-overrides";

const catalogId = 5796;
const productId = 751;
const documentId = 194;
const slug = "new-european-and-american-cross-border-women-s-c-2092068716823863297";
const modelCast = {
  id: "0382",
  name: "김서윤 · Kim Seoyun",
  gender: "여성",
  nationality: "대한민국",
  interests: ["하이패션", "에디토리얼", "런웨이"],
  agency: "AMBA",
  agencyFull: "AI Ambassador",
  faceSeed: "/casts/amba/0382_EA_KR_F_A1/face.webp",
  castFolder: "0382_EA_KR_F_A1",
};

async function main() {
  const override = getSample3BatchOverride(slug);
  if (!override) throw new Error(`SAMPLE3 override missing for ${slug}`);

  const database = db();
  const [existing] = await database
    .select({ id: contentDocuments.id, currentVersion: contentDocuments.currentVersion })
    .from(contentDocuments)
    .where(eq(contentDocuments.id, documentId))
    .limit(1);
  if (!existing) throw new Error(`content document ${documentId} not found`);

  const body = {
    engine: "sample3-built-in-imagegen",
    source: "sample3-fashion-page2",
    catalogId,
    productId,
    rulesetId: "SAMPLE3",
    modelCast,
    assetUrls: override.assetUrls,
    structured: override.structured,
    generation: {
      provider: "codex-built-in-imagegen",
      generatedCount: 1,
      derivedCrops: ["S2", "S3", "OG"],
      garmentReference: "/tmp/pdp-source/fashion-women-page2/01-5796-original.jpg",
    },
  };

  await database
    .update(contentDocuments)
    .set({
      title: override.structured.title,
      locale: "ko",
      status: "review",
      body,
      renderedHtml: override.html,
      currentVersion: (existing.currentVersion ?? 1) + 1,
      updatedAt: new Date(),
    })
    .where(eq(contentDocuments.id, documentId));

  await database.delete(productImages).where(eq(productImages.productId, productId));
  for (const [sort, url] of override.assetUrls.entries()) {
    await database.insert(productImages).values({ productId, url, sort, isDummy: false });
  }

  await database
    .update(catalogIndex)
    .set({ documentId, productId, importState: "imported", sourceStatus: "active", updatedAt: new Date() })
    .where(eq(catalogIndex.id, catalogId));

  console.log(JSON.stringify({ catalogId, productId, documentId, title: override.structured.title, assets: override.assetUrls }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
