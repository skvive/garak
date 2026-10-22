# Wan (완) MaaS — LEXI 마케팅 이미지·영상

Alibaba Cloud Model Studio 워크스페이스 **완(Wan)** 을 PDP/숏폼 마케팅 생성에 연결한다.

## 엔드포인트 (이 프로젝트 기본)

| 구분 | URL |
|------|-----|
| Host | `ws-0yo9dfushj918w65.ap-southeast-1.maas.aliyuncs.com` |
| DashScope | `https://…/api/v1` — **이미지·영상** |
| OpenAI 호환 | `https://…/compatible-mode/v1` — 채팅/목록용 (이미지·영상 생성은 404) |

이미지: `POST /api/v1/services/aigc/multimodal-generation/generation` (sync)  
영상: `POST /api/v1/services/aigc/video-generation/video-synthesis` + `X-DashScope-Async: enable` → `GET /api/v1/tasks/{id}`

## Env

```bash
WAN_API_KEY=sk-...          # 또는 DASHSCOPE_API_KEY / ALIBABA_TOKEN_PLAN_API_KEY
WAN_API_HOST=ws-0yo9dfushj918w65.ap-southeast-1.maas.aliyuncs.com
WAN_IMAGE_MODEL=wan2.7-image
WAN_VIDEO_MODEL=wan2.6-t2v
WAN_I2V_MODEL=wan2.6-i2v
# i2v body: img_url(기본) | media (wan2.7 신규 프로토콜)
WAN_I2V_INPUT=img_url
IMAGE_PROVIDER=wan          # 미설정 시에도 WAN_API_KEY 있으면 wan 우선
```

키는 Git에 넣지 않는다. Vercel Production/Preview env에만 등록.

## 앱 연동

| 경로 | 역할 |
|------|------|
| `src/lib/wan/*` | 클라이언트·이미지·영상 |
| `src/lib/images/generate.ts` | `IMAGE_PROVIDER=wan` 또는 키 있으면 마케팅 3샷도 Wan |
| `POST /api/hq/wan/image` | 상품 마케팅 이미지 1장 |
| `POST /api/hq/wan/video` | `mode: t2v \| i2v \| poll` |
| `src/lib/marketing/wan-prompts.ts` | 숏폼 프롬프트 |

### 영상 예시

```http
POST /api/hq/wan/video
Authorization: Bearer $HQ_API_TOKEN
Content-Type: application/json

{
  "mode": "i2v",
  "imageUrl": "https://…/hero.webp",
  "prompt": "Premium editorial hero video…",
  "duration": 5,
  "resolution": "720P",
  "ratio": "9:16"
}
```

`async: true` → `{ taskId }`만 반환. 이후 `mode: "poll", taskId` 로 URL 수령.  
결과 OSS URL은 약 24시간 만료 — 필요 시 즉시 Blob 저장.

## 모델 확인

워크스페이스에 없는 모델이면 502. 콘솔에서 노출 모델명에 맞춰 `WAN_*_MODEL` 조정.  
일부 Token Plan은 영상이 HappyHorse일 수 있음 → `WAN_VIDEO_MODEL=happyhorse-1.1-t2v` 등.
