import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const metadata = { title: "SAMPLE3 라이브 프리뷰" };

/**
 * SAMPLE3 상품페이지 작업 라이브 프리뷰 — VSCode 미리보기 창 전용.
 * 에이전트가 scripts/pdp-live.cjs 로 tmp/pdp-live.json 을 갱신하면
 * 3초마다 자동 리프레시되어 현재 작업 상품의 이미지/상태를 실시간 보여준다.
 */

type LiveState = {
  updatedAt?: string;
  sku?: string;
  slug?: string;
  title?: string;
  amba?: string;
  step?: string;
  productUrl?: string;
  assets?: { hero?: boolean; detail?: boolean; silhouette?: boolean; og?: boolean };
  history?: Array<{ at: string; step: string; sku: string; title?: string }>;
};

function loadLive(): LiveState {
  try {
    const p = path.join(process.cwd(), "tmp", "pdp-live.json");
    return JSON.parse(fs.readFileSync(p, "utf8")) as LiveState;
  } catch {
    return {};
  }
}

const STEP_LABEL: Record<string, string> = {
  source: "① 원본 확보",
  hero: "② S1 히어로 생성",
  crops: "③ S2/S3/OG 크롭",
  override: "④ 오버라이드 반영",
  check: "⑤ 로컬 검증",
  live: "⑥ 라이브 확인",
};

const STEP_ORDER = ["source", "hero", "crops", "override", "check", "live"];

export default function Sample3LivePreview() {
  const s = loadLive();
  const assets = s.assets ?? {};
  const stepIdx = STEP_ORDER.findIndex((k) => k === s.step);

  const img = (file: string, exists: boolean, label: string, wh: string) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 12,
          fontWeight: 700,
          color: exists ? "#1a1a1a" : "#b5b0a8",
        }}
      >
        {label}
        {exists ? " ✓" : " — 대기"}
      </p>
      {exists ? (
        <img
          src={`/pdp/${s.sku}/${file}`}
          alt={label}
          style={{
            width: "100%",
            aspectRatio: wh,
            objectFit: "cover",
            borderRadius: 12,
            border: "1px solid #e8e4dc",
            background: "#ebe6dc",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: wh,
            borderRadius: 12,
            background: "repeating-linear-gradient(-45deg,#ebe6dc 0 10px,#e0dcd2 10px 20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9a958c",
            fontSize: 13,
          }}
        >
          생성 대기
        </div>
      )}
    </div>
  );

  let productLink = s.productUrl || (s.slug ? `/ko/product/${s.slug}` : "");
  // slug 매칭 실패 대비 — 로컬 DB에서 현재 slug의 실제 존재 확인은 하지 않고 URL만 안내
  const stepBar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {STEP_ORDER.map((k, i) => (
        <span
          key={k}
          style={{
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: i < stepIdx ? "#e85d4c" : i === stepIdx ? "#f5d7cc" : "#f0ede7",
            color: i < stepIdx ? "#fff" : i === stepIdx ? "#8a3a2c" : "#9a958c",
          }}
        >
          {STEP_LABEL[k]}
        </span>
      ))}
    </div>
  );

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px", fontFamily: "Pretendard, system-ui, sans-serif", background: "#faf9f7", color: "#1a1a1a" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: ".04em" }}>LEXI<span style={{ color: "#e85d4c" }}>.</span></span>
        <span style={{ fontSize: 13, color: "#6e6e73" }}>SAMPLE3 상품페이지 작업 미리보기</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9a958c" }}>
          자동 새로고침 3초 · 갱신: {s.updatedAt ?? "-"}
        </span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, border: "1px solid #e8e4dc", borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#6e6e73" }}>작업 단계</p>
        <div>{stepBar}</div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#6e6e73" }}>XXX</p>
        <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
{`SKU : ${s.sku || "-"}
Slug: ${s.slug || "-"}
제목: ${s.title || "-"}
AMBA: ${s.amba || "-"}`}
        </pre>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, textWrap: "balance" }}>{s.title || "아직 작업 중인 상품 없음"}</h1>
        {productLink ? (
          <a
            href={productLink}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#e85d4c", fontWeight: 700, fontSize: 13, marginLeft: "auto" }}
          >
            상품페이지 열기 →
          </a>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {img("hero-v1.webp", assets.hero ?? false, "S1 Hero", "4/5")}
        {img("detail-v1.webp", assets.detail ?? false, "S2 Detail", "1/1")}
        {img("silhouette-v1.webp", assets.silhouette ?? false, "S3 Desire", "4/5")}
        {img("og-v1.webp", assets.og ?? false, "OG", "1200/630")}
      </div>

      <section style={{ marginTop: 16, border: "1px solid #e8e4dc", borderRadius: 14, padding: "12px 16px" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700 }}>작업 이력</h2>
        {s.history?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#6e6e73", lineHeight: 1.7 }}>
            {s.history.reverse().map((h) => (
              <li key={h.at}>{h.at} — {STEP_LABEL[h.step] ?? h.step} · {h.title ?? h.sku}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: "#9a958c" }}>아직 기록 없음</p>
        )}
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { try { location.reload(); } catch (_) {} }, 3000);`,
        }}
      />
    </main>
  );
}