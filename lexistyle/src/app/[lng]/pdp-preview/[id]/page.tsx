import { localStore, reviveDates } from "@/lib/local-store";
import type { PdpDocumentMem } from "@/lib/pdp/generate";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "PDP 미리보기" };

function getDoc(id: number): PdpDocumentMem | null {
  const s = localStore();
  const docs: PdpDocumentMem[] = ((s.pdpDocs ?? []) as any[]).map((d: any) =>
    reviveDates(d, ["createdAt"]) as unknown as PdpDocumentMem,
  );
  return docs.find((d) => d.id === id) ?? null;
}

export default function PdpViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = params instanceof Promise ? undefined : params;
  return <PdpViewPageInner paramsPromise={params} />;
}

async function PdpViewPageInner({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  const doc = getDoc(numId);
  if (!doc) notFound();

  const cat = (doc.body as any)?.catalogId ?? doc.catalogId;

  return (
    <main style={{ minHeight: "100vh", background: "#fff" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#1a1a1a",
          color: "#fff",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 13,
          fontFamily: "sans-serif",
        }}
      >
        <a href="/pdp-preview" style={{ color: "#e85d4c", textDecoration: "none", fontWeight: 700 }}>
          ← 목록
        </a>
        <span style={{ fontWeight: 600 }}>#{doc.id}</span>
        <span style={{ color: "#aaa" }}>{doc.title}</span>
        <span style={{ color: "#888" }}>엔진: {doc.engine ?? "?"}</span>
        <span style={{ color: "#888" }}>버전: {(doc as any).currentVersion ?? 1}</span>
        <span style={{ marginLeft: "auto", color: "#888", fontSize: 11 }}>
          catalogId={cat} · 문서생성: {doc.createdAt?.toLocaleString() ?? "?"}
        </span>
      </div>
      <div style={{ marginTop: 48 }}>
        <iframe
          srcDoc={doc.renderedHtml}
          style={{
            border: 0,
            width: "100%",
            minHeight: "calc(100vh - 48px)",
            background: "#faf9f7",
          }}
          title={doc.title}
        />
      </div>
    </main>
  );
}