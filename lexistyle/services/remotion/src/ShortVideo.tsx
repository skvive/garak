/**
 * CommerceShorts 9:16 광고 컴포지션 — 후킹 배너 + 씬별 켄번/AI 모션 + 한글 자막 + CTA + 워터마크.
 * 입력은 앱의 ShortScript(src/lib/shorts/script.ts)와 같은 모양.
 */
import {
  AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring,
  useCurrentFrame, useVideoConfig,
} from "remotion";

export type ShortScene = {
  sceneId: number;
  duration: number;
  overlayText: string;
  narration: string;
  visual: "kenburns" | "wan_i2v";
  imageIndex: number;
};
export type ShortVideoProps = {
  hookText: string;
  cta: string;
  scenes: ShortScene[];
  images: string[];
  wanVideoUrl?: string | null;
  watermark?: string | null;
};

const ACCENT = "#FF5C4D";
const INK = "#111114";
const FONT = "'Pretendard','Noto Sans CJK KR','Noto Sans KR','Apple SD Gothic Neo',sans-serif";

function Caption({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
      <div
        style={{
          transform: `scale(${0.85 + pop * 0.15})`,
          opacity: pop,
          background: "rgba(0,0,0,0.62)",
          color: "#fff",
          fontFamily: FONT,
          fontSize: 76,
          fontWeight: 800,
          lineHeight: 1.3,
          padding: "26px 44px",
          borderRadius: 28,
          textAlign: "center",
          maxWidth: 940,
          wordBreak: "keep-all",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}

function SceneClip({ scene, images, wanVideoUrl }: { scene: ShortScene; images: string[]; wanVideoUrl?: string | null }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.1], { extrapolateRight: "clamp" });
  const fade = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const src = images[scene.imageIndex] ?? images[0] ?? "";
  const useWan = scene.visual === "wan_i2v" && wanVideoUrl;
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade }}>
      {useWan ? (
        <OffthreadVideo src={wanVideoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : src ? (
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
      ) : null}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)" }} />
      <Caption text={scene.overlayText} />
    </AbsoluteFill>
  );
}

export const ShortVideo: React.FC<ShortVideoProps> = ({ hookText, cta, scenes, images, wanVideoUrl, watermark }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: "clamp" });
  const lastFrom = durationInFrames - Math.round((scenes[scenes.length - 1]?.duration ?? 3) * fps);
  let acc = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {scenes.map((sc, i) => {
        const from = acc;
        const dur = Math.max(1, Math.round(sc.duration * fps));
        acc += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneClip scene={sc} images={images} wanVideoUrl={wanVideoUrl} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 12, width: `${progress}%`, background: ACCENT }} />
        <div
          style={{
            position: "absolute", top: 110, left: 60, right: 60, textAlign: "center",
            background: "rgba(17,17,20,0.85)", color: "#fff", fontFamily: FONT, fontSize: 64,
            fontWeight: 800, lineHeight: 1.3, padding: "24px 32px", borderRadius: 24, wordBreak: "keep-all",
          }}
        >
          {hookText}
        </div>
        <Sequence from={Math.max(0, lastFrom)}>
          <div
            style={{
              position: "absolute", bottom: 170, left: 160, right: 160, textAlign: "center",
              background: ACCENT, color: "#fff", fontFamily: FONT, fontSize: 56, fontWeight: 800,
              padding: "26px 0", borderRadius: 999,
            }}
          >
            {cta}
          </div>
        </Sequence>
        {watermark ? (
          <div style={{ position: "absolute", bottom: 60, right: 50, color: "rgba(255,255,255,0.75)", fontFamily: FONT, fontSize: 36, fontWeight: 700 }}>
            {watermark}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export function shortFrames(scenes: ShortScene[], fps: number): number {
  return scenes.reduce((a, s) => a + Math.max(1, Math.round(s.duration * fps)), 0);
}
