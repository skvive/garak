export const metadata = {
  title: "LEXID Hero Preview · sample2",
  description: "LEXID landing hero video — analog to digital grammar",
};

export default function Sample2Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0c",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        padding: "24px 16px 48px",
        wordBreak: "keep-all",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>
          LEXID · Hero video preview
        </h1>
        <div
          style={{
            position: "relative",
            borderRadius: 20,
            overflow: "hidden",
            aspectRatio: "16 / 9",
            background: "#111",
          }}
        >
          <video
            src="/sample2/lexid-hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              inset: "18% 22%",
              background: "rgba(255,255,255,.72)",
              backdropFilter: "blur(16px)",
              borderRadius: 28,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: 28,
              color: "#111",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "#3b6cff",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              INDEPENDENT DESIGN STUDIO - JEJU
            </div>
            <h2
              style={{
                fontSize: "clamp(22px, 3.2vw, 36px)",
                margin: "0 0 10px",
                lineHeight: 1.25,
                textWrap: "balance",
              }}
            >
              We write the grammar of your brand.
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, maxWidth: "42ch", opacity: 0.85 }}>
              LEXID는 브랜드·마케팅·프로덕트를 하나의 문법으로 설계하는 디지털 퍼스트 디자인 스튜디오입니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
