import type { Metadata } from "next";
import { buildProductMetadata } from "@/lib/seo/og";

/** Cache-bust share crawlers after OG refresh */
const OG = "https://lexistyle.vercel.app/sample3/og.jpg?v=2";

export const metadata: Metadata = {
  ...buildProductMetadata({
    title: "LEXI 하트 자수 통기 반팔 티",
    description: "담백한 설렘 · 하트 자수 통기 반팔 · LEXI Curated",
    image: OG,
    path: "/sample3",
    brand: "LEXI",
  }),
  title: "LEXI 하트 자수 통기 반팔 티 · sample3",
};

/** Static HTML lives in public/sample3 — this route redirects for clean /sample3 */
export default function Sample3Page() {
  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 0 }}>
      <iframe
        title="LEXI1 PDP"
        src="/sample3/index.html"
        style={{ border: 0, width: "100%", height: "100vh", display: "block" }}
      />
    </main>
  );
}
