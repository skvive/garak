/**
 * 스토리보드 → 숏폼 영상 컴포지션 (M10) — Amore video_gen.py 를 Remotion(JS 네이티브)으로 이식.
 * 씬별 Ken-Burns 줌 + 자막 박스(오버레이) + 진행바. 렌더러 무관 스펙 상수는 Amore에서 이식.
 * BGM: 라이선스 트랙만 사용(번들 스톡 mp3 미포함 — 배포 전 교체). staticFile로 주입.
 */
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";

export type Scene = { duration: number; imageIndex: number; overlayText: string };
export type StoryboardProps = {
  bgmMood: string;
  scenes: Scene[];
  images: string[];
  brand?: string;
  bgmFile?: string; // 라이선스 오디오 파일명(public/) — 없으면 무음
};

const ACCENT = "#FF5C4D";
const FONT = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";

function SceneClip({ scene, images }: { scene: Scene; images: string[] }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], { extrapolateRight: "clamp" });
  const src = images[scene.imageIndex] ?? images[0] ?? "";
  return (
    <AbsoluteFill style={{ backgroundColor: "#111114" }}>
      {src ? (
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
      ) : (
        <AbsoluteFill style={{ background: "#1c1c20" }} />
      )}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 300 }}>
        <div style={{
          background: "rgba(0,0,0,0.55)", color: "#fff", fontFamily: FONT, fontSize: 72,
          fontWeight: 800, lineHeight: 1.2, padding: "24px 40px", borderRadius: 28,
          textAlign: "center", letterSpacing: -1, maxWidth: 900,
        }}>{scene.overlayText}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const StoryboardVideo: React.FC<StoryboardProps> = ({ scenes, images, brand = "LEXI", bgmFile }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: "clamp" });
  let acc = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#111114" }}>
      {scenes.map((sc, i) => {
        const from = acc;
        const dur = Math.max(1, Math.round(sc.duration * fps));
        acc += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneClip scene={sc} images={images} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${progress}%`, background: ACCENT }} />
        <div style={{ position: "absolute", bottom: 120, width: "100%", textAlign: "center", color: "#fff", fontFamily: FONT, fontSize: 48, fontWeight: 800, letterSpacing: 2 }}>
          {brand}<span style={{ color: ACCENT }}>.</span>
        </div>
      </AbsoluteFill>
      {bgmFile ? <Audio src={staticFile(bgmFile)} /> : null}
    </AbsoluteFill>
  );
};

/** 스토리보드 총 길이(프레임) 계산 헬퍼 */
export function totalFrames(scenes: Scene[], fps: number): number {
  return scenes.reduce((a, s) => a + Math.max(1, Math.round(s.duration * fps)), 0);
}
