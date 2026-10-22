import type { Metadata } from "next";
import { buildProductMetadata } from "@/lib/seo/og";

const OG = "/sample3/mock-chiffon-floral/og-opt.webp";

export const metadata: Metadata = {
  ...buildProductMetadata({
    title: "Soft Petal Chiffon Dress",
    description: "Soft floral days · LEXI Curated",
    image: OG,
    path: "/sample3/mock-chiffon-floral",
    brand: "LEXI",
  }),
  title: "잔꽃 시폰 원피스 · SAMPLE3 mock",
};

/** Static HTML: public/sample3/mock-chiffon-floral/index.html */
export default function Sample3MockChiffonFloralPage() {
  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 0 }}>
      <iframe
        title="LEXI SAMPLE3 mock — chiffon floral dress"
        src="/sample3/mock-chiffon-floral/index.html"
        style={{ border: 0, width: "100%", height: "100vh", display: "block" }}
      />
    </main>
  );
}
