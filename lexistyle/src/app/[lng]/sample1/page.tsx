export const metadata = {
  title: "LEXI · Knit Dress Promo · sample1",
  description: "LEXI color-block knit mini dress Wan promo sample",
};

export default function Sample1Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 600px at 50% -10%, #2a2420 0%, #111 55%)",
        color: "#faf9f7",
        fontFamily: "Pretendard, system-ui, sans-serif",
        fontSize: 14,
        lineHeight: 1.6,
        wordBreak: "keep-all",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "28px 16px 8px",
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: "0.12em",
        }}
      >
        LEXI<span style={{ color: "#e85d4c" }}>.</span>
      </div>
      <p style={{ textAlign: "center", opacity: 0.75, marginBottom: 20 }}>
        배색 니트 미니 원피스 · Wan 실생성 홍보 영상
      </p>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto 28px",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,.45)",
          background: "#1a1a1a",
          aspectRatio: "9 / 16",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            zIndex: 1,
            background: "rgba(26,26,26,.82)",
            color: "#faf9f7",
            fontWeight: 700,
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(232,93,76,.5)",
          }}
        >
          LEXI OFFICIAL
        </div>
        <video
          src="/sample1/promo.mp4"
          controls
          autoPlay
          muted
          playsInline
          loop
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      <h2 style={{ textAlign: "center", fontSize: 14, fontWeight: 600, opacity: 0.8, margin: "8px 0 12px" }}>
        씬별 클립 (S1 · S2 · S3)
      </h2>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto 40px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "0 12px",
        }}
      >
        {[
          { src: "/sample1/s1-hero.mp4", cap: "LEXI Hero · 설렘 실루엣" },
          { src: "/sample1/s2-detail.mp4", cap: "LEXI Detail · 니트 텍스처" },
          { src: "/sample1/s3-desire.mp4", cap: "LEXI Desire · 오늘의 룩" },
        ].map((item) => (
          <section
            key={item.src}
            style={{
              position: "relative",
              borderRadius: 14,
              overflow: "hidden",
              background: "#1a1a1a",
              aspectRatio: "9 / 16",
            }}
          >
            <video
              src={item.src}
              muted
              playsInline
              autoPlay
              loop
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 14,
                padding: "10px 12px",
                background: "rgba(0,0,0,.55)",
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              {item.cap}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
