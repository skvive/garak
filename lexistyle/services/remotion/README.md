# LEXI Remotion 숏폼 렌더 (M10)

스토리보드 JSON(`src/lib/marketing/storyboard.ts` 스키마) → **MP4**.
Amore `video_gen.py`(MoviePy)를 JS 네이티브 Remotion으로 이식 — 결정적·템플릿 재사용.

## 왜 Remotion (권장)
- lexistyle가 이미 JS/TS 스택 → Python MoviePy 서비스 불필요.
- 스토리보드 JSON이 `<Sequence>`로 1:1 매핑(duration→frames, imageIndex→asset, overlayText→자막).
- 헤드리스 렌더(`@remotion/renderer`)로 서버/Lambda 배치 가능.

## 렌더
```bash
cd services/remotion
npm install
# HQ에서 스토리보드 자산 조회: GET /api/hq/marketing/:id → payload.storyboard
# props.json = { bgmMood, brand, scenes[], images[], bgmFile? }
npx remotion render StoryboardVideo out/video.mp4 --props=./props.json
```

## props 스키마
```jsonc
{
  "bgmMood": "clean",
  "brand": "LEXI",
  "images": ["https://.../1.jpg", "https://.../2.jpg", "..."],
  "scenes": [
    { "duration": 4, "imageIndex": 0, "overlayText": "속건조 끝" }
  ],
  "bgmFile": "bgm/clean.mp3"   // 선택. public/ 에 라이선스 트랙만.
}
```

## ⚠️ 에셋 라이선스
- **BGM 미포함**. Amore 번들 스톡 mp3는 재배포 불가 → 라이선스 트랙을 `public/bgm/`에 넣고 `bgmFile`로 지정.
- 폰트는 오픈 한글 스택(Pretendard/Noto). 상용 폰트 번들 금지.
- 브랜드 문자열은 `brand` prop로 주입(하드코딩 금지).

## 파이프라인 연결
1. HQ `generateMarketingKit` → `storyboard` 자산 생성(검증·정규화 완료 JSON).
2. 렌더 워커가 자산 조회 → props.json 구성 → `remotion render` → MP4.
3. MP4 URL을 `marketing_assets.renderUrl`에 기록 → 채널 배포.
