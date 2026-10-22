import { Composition } from "remotion";
import { StoryboardVideo, totalFrames, type StoryboardProps } from "./StoryboardVideo";
import { ShortVideo, shortFrames, type ShortVideoProps } from "./ShortVideo";

const FPS = 30;

// 기본(데모) 입력 — 실제 렌더 시 --props 로 스토리보드 JSON 주입
const DEFAULT: StoryboardProps = {
  bgmMood: "clean",
  brand: "LEXI",
  images: [],
  scenes: [
    { duration: 4, imageIndex: 0, overlayText: "속건조 끝" },
    { duration: 4, imageIndex: 1, overlayText: "하루종일 보습" },
    { duration: 4, imageIndex: 2, overlayText: "정품 직소싱" },
    { duration: 3, imageIndex: 3, overlayText: "지금 담기" },
  ],
};

const SHORT_DEFAULT: ShortVideoProps = {
  hookText: "아직도 고르기만 하세요?",
  cta: "지금 바로 구매",
  images: [],
  watermark: "CommerceShorts",
  scenes: [
    { sceneId: 1, duration: 3, overlayText: "요즘 난리 난 아이템", narration: "", visual: "kenburns", imageIndex: 0 },
    { sceneId: 2, duration: 3, overlayText: "직접 써보니 달라요", narration: "", visual: "kenburns", imageIndex: 0 },
    { sceneId: 3, duration: 3, overlayText: "후기가 증명해요", narration: "", visual: "kenburns", imageIndex: 0 },
    { sceneId: 4, duration: 3, overlayText: "수량 한정 진행 중", narration: "", visual: "kenburns", imageIndex: 0 },
    { sceneId: 5, duration: 3, overlayText: "지금 바로 구매", narration: "", visual: "kenburns", imageIndex: 0 },
  ],
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="StoryboardVideo"
      component={StoryboardVideo}
      durationInFrames={totalFrames(DEFAULT.scenes, FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={DEFAULT}
      // 스토리보드 길이에 맞춰 프레임 수 계산 (props 주입 시)
      calculateMetadata={({ props }) => ({
        durationInFrames: totalFrames(props.scenes, FPS),
        fps: FPS, width: 1080, height: 1920,
      })}
    />
    <Composition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={shortFrames(SHORT_DEFAULT.scenes, FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={SHORT_DEFAULT}
      calculateMetadata={({ props }) => ({
        durationInFrames: shortFrames(props.scenes, FPS),
        fps: FPS, width: 1080, height: 1920,
      })}
    />
  </>
);
