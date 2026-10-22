# LEXI Studio × Cafe24 전환 마스터 명세서

버전: 1.0  
고정일: 2026-07-17  
상태: 구현 기준선

## 1. 목표

LEXI의 커머스 원장을 Cafe24로 단일화하고, LEXI 자체 백엔드는 쇼핑몰 디자인과 상품 콘텐츠를 제작·검수·배포하는 Studio로 전환한다.

### 시스템 소유권

| 영역 | 단일 진실 원천 |
|---|---|
| 상품·옵션·재고·가격·쿠폰 | Cafe24 |
| 장바구니·체크아웃·결제·주문·배송·회원 | Cafe24 |
| 디자인 토큰·홈 섹션·에디토리얼 | LEXI Studio / Neon |
| 이미지·동영상·PDP 문서·생성 작업 | LEXI Studio / Neon + Object Storage |
| 검수·승인·버전·Cafe24 배포 이력 | LEXI Studio / Neon |

## 2. 금지 원칙

1. LEXI와 Cafe24에 주문·재고·결제 원장을 동시에 만들지 않는다.
2. Cafe24 게시 실패를 성공으로 표시하지 않는다.
3. 승인되지 않은 콘텐츠는 Cafe24에 게시할 수 없다.
4. 외부 API 키·OAuth 토큰을 응답·로그·문서에 노출하지 않는다.
5. 게시 전 버전을 보존하고, 모든 게시에는 감사 로그와 롤백 기준을 남긴다.

## 3. 목표 정보 구조

```text
/studio
├── /design
│   ├── /themes       브랜드 토큰
│   └── /home         홈 섹션 편집·정렬·예약
├── /creator
│   ├── /library      이미지·동영상 라이브러리
│   ├── /jobs         콘텐츠 생성 작업
│   ├── /pdp          Cafe24 상품별 PDP 문서
│   ├── /review       승인 큐
│   └── /publish      게시·롤백·성과
├── /cafe24           OAuth·상태·상품 projection
└── /decisions        후속 질문 대기열
```

상품·주문·배송·결제 운영 버튼은 Cafe24 공식 관리자 대시보드로 이동한다.

## 4. 데이터 모델

### design_themes

- `id`, `name`, `tokens`, `status`, `version`
- 색상·폰트·간격·모서리·컴포넌트 스타일을 JSON으로 저장한다.

### design_sections

- `id`, `slot`, `title`, `payload`, `sort`, `status`
- `starts_at`, `ends_at`, `published_at`, `version`
- 홈 화면의 Hero, Category, Ranking, Time Deal, Look, Brand, UGC 슬롯을 표현한다.

### content_documents / content_versions

- 문서 종류: `pdp`, `editorial`, `campaign`, `home_section`
- Cafe24 참조: `mall_id`, `shop_no`, `product_no`
- 상태: `draft → review → approved → published | rejected | archived`
- 버전은 immutable snapshot으로 저장한다.

### media_assets

- 종류: `image`, `video`, `html`, `document`
- 원본 URL, MIME, 크기, 폭·높이·재생시간, alt, tags, metadata
- 생성 출처와 Cafe24 게시 대상 참조를 보존한다.

### generation_jobs

- 종류: `pdp`, `image`, `cardnews`, `storyboard`, `video`, `copy`
- 상태: `queued → processing → completed | failed | cancelled`
- 입력·출력·비용·모델·오류·시작/완료 시각을 기록한다.

### publish_events

- 대상: Cafe24 상품 상세 HTML, 상품 이미지, 홈/스킨 콘텐츠
- 상태: `queued → publishing → published | failed | rolled_back`
- 요청 payload, 원격 응답, 이전 버전, 게시자, 오류를 기록한다.

### decision_queue

- 구현을 막지 않는 질문을 `open` 상태로 축적한다.
- 우선순위, 기본 결정, 최종 결정, 영향 영역을 기록한다.

## 5. Phase 완료 기준

### Phase 0 — 경계·명세 고정

- 본 명세서와 결정 대기열이 리포 및 Downloads에 존재한다.
- Cafe24=Commerce, LEXI=Design/Content 경계를 UI에 표시한다.

### Phase 1 — Studio 셸

- `/studio` 하위 IA가 생성되고 역할별 내비게이션이 동작한다.
- Cafe24 운영 대시보드 링크와 연결 상태가 표시된다.

### Phase 2 — Design CMS

- 테마와 홈 섹션 CRUD API가 존재한다.
- 저장된 published 섹션을 스토어 홈이 우선 렌더링한다.
- DB 미연결 시 기존 정적 콘텐츠로 안전하게 폴백한다.

### Phase 3 — Media + Generation

- 미디어 등록·검색과 생성 작업 생성·상태 변경이 가능하다.
- 기존 marketing/Remotion 파이프라인과 연결할 job 계약이 존재한다.
- 외부 생성 키가 없으면 결정적 preview 산출물로 완료한다.

### Phase 4 — Cafe24 Publish

- 승인된 PDP 문서를 Cafe24 Admin API 상품 상세로 게시한다.
- 결과와 오류를 publish_events에 기록한다.
- 게시 전 content version을 보존하며 롤백 요청을 기록한다.

### Phase 5 — Commerce 이관

- Studio 내 상품·주문 관리는 Cafe24 관리자 링크로 대체한다.
- LEXI 자체 cart/checkout/PG는 legacy로 명시하고 새 운영 진입점에서 제거한다.
- Cafe24 연결 전 기존 프론트는 read-only preview로 유지한다.

### Phase 6 — Creator 운영 완성

- 상품 선택 → 생성 → 검수 → 승인 → 게시 → 성과 기록 흐름이 한 화면군에서 완결된다.
- 미승인 게시 차단, 실패 표시, 결정 대기열, 감사 로그가 동작한다.

## 6. API 계약

```text
GET/POST/PATCH /api/studio/themes
GET/POST/PATCH /api/studio/sections
GET/POST       /api/studio/media
GET/POST/PATCH /api/studio/jobs
GET/POST/PATCH /api/studio/documents
GET/POST       /api/studio/publish
GET/POST/PATCH /api/studio/decisions
GET            /api/studio/dashboard
```

모든 쓰기 API는 관리자 세션을 요구한다.

## 7. Cafe24 게시 매핑

| LEXI 산출물 | Cafe24 대상 |
|---|---|
| PDP HTML | Admin Products 상품 상세 설명 |
| 상세 이미지 URL | 상품 상세 HTML 또는 상품 이미지 리소스 |
| 동영상 URL | PDP HTML video/외부 호스팅 링크 |
| SEO 카피 | 상품명·요약·SEO 필드(승인 범위 내) |
| 홈 섹션 JSON | Cafe24 스킨 삽입 스크립트가 읽는 published feed |

## 8. 보안·운영

- Cafe24 OAuth access token은 서버에서만 해석한다.
- 관리자 allowlist가 비어 있는 프로덕션 환경은 경고 상태다.
- Cron/worker는 멱등 키를 사용한다.
- 콘텐츠 게시 API는 `documentId + version` 단위로 멱등 처리한다.
- 원격 호출은 타임아웃·재시도 제한·오류 전문 저장을 적용한다.

## 9. 기본 결정과 대기열

사용자 판단이 필요한 항목은 구현을 중단하지 않고 다음 기본값으로 진행한다.

1. 미디어 저장소: Vercel Blob 미설정 시 외부 URL 등록 모드.
2. 영상 렌더: Remotion 서비스 계약을 유지하고 워커 미설정 시 storyboard preview.
3. Cafe24 스킨 자동 배포: 상품 상세 API 우선, 스킨 파일 직접 수정은 승인 전 대기.
4. 기존 Next 스토어: Cafe24 몰 전환 완료 전 preview/비상 폴백으로 유지.
5. 자체 PG: 신규 운영 경로에서 숨기고 코드 삭제는 결제 정산 확인 후 수행.

세부 질문은 `docs/lexi-studio-decision-queue.md` 및 `/studio/decisions`에서 관리한다.
