# LEXI VS Code PDP Studio 기획

## 1. 목표

VS Code 안에서 LEXI 패션 상품을 선택하고 다음 작업을 하나의 흐름으로 수행한다.

```text
상품 선택 → 원본/AMBA 분석 → Hero 생성 → 원본 비교 → SAMPLE3 소스 편집
→ 미리보기 → 승인 → 배포 → style.lexid.site 라이브 검증
```

Codex 데스크톱 화면을 복제하는 것이 아니라, 저장소의 SAMPLE3 규칙과 렌더러를 사용하는 LEXI 전용 VS Code Extension을 만든다.

## 2. 권장 구성

```text
┌─ LEXI PDP Activity Bar ─┬─ Editor Group ────────────────────────┐
│ 대기                    │ [SOURCE] [PREVIEW] [COMPARE] [LOG]    │
│ 생성 중 5/40            │                                      │
│ 검수 대기               │ SOURCE  : SAMPLE3 JSON/HTML           │
│ 승인 완료               │ PREVIEW : 실제 렌더링                 │
│ 배포 완료               │ COMPARE : 원본 ↔ 생성 Hero            │
└─────────────────────────┴──────────────────────────────────────┘
```

### Activity Bar / Tree View

- 상품 40개와 현재 상태를 표시한다.
- 상품을 선택하면 해당 `.sample3.json` 편집기를 연다.
- 완료/실패/보류/사용량 대기 상태와 진행률을 표시한다.

### Custom Text Editor

- `.sample3.json`을 VS Code `TextDocument` 기반으로 관리한다.
- SOURCE 탭은 JSON/HTML 소스를 보여준다.
- PREVIEW 탭은 `renderPdp()` 결과를 격리된 iframe에 표시한다.
- COMPARE 탭은 원본 이미지와 생성 Hero를 나란히 표시한다.
- 저장, Undo/Redo, 외부 파일 변경을 VS Code 편집기와 동기화한다.

### Task / Output

- 이미지 생성, Sharp 크롭, 타입 검사, 빌드, 배포, 라이브 검증을 작업 단위로 실행한다.
- 진행 로그는 Output Channel과 상태 표시줄에 노출한다.
- 오래 걸리는 작업은 `완료/전체`, 퍼센트, ETA를 표시한다.

## 3. 단일 진실 원천

확장 프로그램에 SAMPLE3 규칙을 복사하지 않는다. 아래 파일을 직접 사용한다.

```text
.agents/skills/lexi-sample3-fashion-publisher/SKILL.md
.clinerules/sample3-pdp.mdc
docs/lexi-sample3-pdp-style.md
src/lib/pdp/ruleset.ts
src/lib/pdp/concept-spec.ts
src/lib/pdp/storefront.ts
src/lib/images/generate.ts
```

확장 프로그램은 스킬을 실행하고 결과를 편집·검수·승인하는 UI 역할만 담당한다.

## 4. 상태 모델

```ts
export type PdpJobStatus =
  | "queued"
  | "analyzing-source"
  | "generating-hero"
  | "review-required"
  | "source-ready"
  | "preview-ready"
  | "approved"
  | "deploying"
  | "live-verified"
  | "blocked-usage-limit"
  | "blocked-source-mismatch"
  | "failed";

export interface PdpJob {
  id: string;
  catalogId: number;
  slug: string;
  titleInternal: string;
  titleMarketing?: string;
  sourceImageUrl: string;
  ambaId?: string;
  status: PdpJobStatus;
  progress: { completed: number; total?: number; etaSeconds?: number };
  assets?: { hero?: string; detail?: string; silhouette?: string; og?: string };
  error?: { code: string; message: string; retryable: boolean };
  updatedAt: string;
}
```

작업 상태는 `.lexi-pdp/jobs.json` 또는 SQLite에 기록해 VS Code 재시작 후에도 이어서 실행한다. 비밀정보는 저장하지 않는다.

## 5. 프로그램 구조

```text
tools/lexi-pdp-vscode/
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ extension.ts
│  ├─ commands/
│  │  ├─ generate.ts
│  │  ├─ approve.ts
│  │  ├─ deploy.ts
│  │  └─ resume.ts
│  ├─ views/
│  │  └─ productTreeProvider.ts
│  ├─ editors/
│  │  └─ sample3EditorProvider.ts
│  ├─ services/
│  │  ├─ workspaceService.ts
│  │  ├─ skillRunner.ts
│  │  ├─ imageGeneration.ts
│  │  ├─ sharpCrop.ts
│  │  ├─ sample3Renderer.ts
│  │  ├─ validator.ts
│  │  ├─ deployment.ts
│  │  └─ liveVerifier.ts
│  └─ webview/
│     ├─ main.ts
│     └─ styles.css
└─ media/
```

## 6. 공급자 인터페이스

```ts
export interface ImageGenerationProvider {
  readonly id: string;
  generateHero(input: {
    sourceImagePath: string;
    ambaFacePath: string;
    prompt: string;
    outputPath: string;
  }): Promise<{ path: string; model: string }>;
}

export interface AgentRunner {
  run(input: {
    skillPath: string;
    productId: string;
    signal: AbortSignal;
  }): AsyncIterable<{ type: "progress" | "log" | "result"; data: unknown }>;
}
```

이미지 공급자는 `Wan`, `OpenAI`, `ComfyUI`, 명령행 실행기를 교체할 수 있게 한다. 비용 우선 기본값은 Wan 또는 로컬 ComfyUI로 두고, 원본 일치 실패 때만 상위 편집 모델을 선택한다.

API 키는 `.sample3.json`, 설정 파일, 로그에 기록하지 않고 VS Code `SecretStorage`에 저장한다.

## 7. SOURCE / PREVIEW 동기화

1. `.sample3.json` 변경을 감지한다.
2. 300~500ms debounce 후 JSON Schema를 검증한다.
3. 유효하면 `renderPdp()`를 호출한다.
4. 렌더 HTML을 Webview로 전달한다.
5. 오류가 있으면 마지막 정상 미리보기를 유지하고 SOURCE 탭에 진단을 표시한다.

Webview는 `postMessage`로 Extension Host와 통신하며, 직접 파일이나 비밀정보에 접근하지 못하게 한다. CSP nonce와 허용된 로컬 리소스 루트만 사용한다.

## 8. 생성·승인·배포 게이트

### 생성

- 원본 이미지와 AMBA 얼굴을 모두 입력한다.
- 상품당 S1 Hero 한 장만 AI 생성한다.
- S2/S3/OG는 Sharp 크롭한다.
- 임시 PNG는 변환 후 `public/`에서 제거한다.

### 승인 전 검증

- Hero에서 머리, 양쪽 신발, 옷단이 잘리지 않았는가
- 원본과 색상, 넥라인, 기장, 패턴, 실루엣이 일치하는가
- AMBA 얼굴이 지정 모델과 일치하는가
- WebP 4종과 SAMPLE3 구조가 모두 존재하는가
- 고객 노출 HTML에 CJ, 생성 규칙, 원가가 없는가
- 영문 원본명은 DETAILS의 Internal name에만 있는가

### 배포

- 승인되지 않은 작업은 배포할 수 없다.
- `npx tsc --noEmit`과 프로덕션 빌드가 통과해야 한다.
- Vercel 배포 후 `style.lexid.site` 실제 상품 URL에서 H1, 이미지, AMBA, WHY LEXI, DETAILS, FAQ, CTA를 확인한다.
- 실제 검증까지 성공한 경우에만 `live-verified`로 변경한다.

## 9. VS Code 명령

```text
LEXI: PDP Studio 열기
LEXI: 상품 목록 새로고침
LEXI: 선택 상품 생성
LEXI: 생성 중지
LEXI: 사용량 회복 후 재개
LEXI: 원본과 비교
LEXI: SAMPLE3 검증
LEXI: 승인
LEXI: 프로덕션 배포
LEXI: 라이브 페이지 열기
```

## 10. 개발 단계

### 1단계 — 로컬 MVP

- Extension 골격, Activity Bar, 상품 Tree View
- SOURCE/PREVIEW 전환
- 기존 `.sample3.json` 한 건 렌더
- 로컬 타입 검사와 검증 결과 표시

### 2단계 — 생성 파이프라인

- AgentRunner와 ImageGenerationProvider
- 원본/AMBA 비교 화면
- Hero 생성과 Sharp 파생 크롭
- 작업 중단/재개와 비용 카운터

### 3단계 — 승인·배포

- 승인 게이트
- Vercel 배포 Task
- 프로덕션 URL 검증
- 오류 재시도와 배포 이력

### 4단계 — 배포 가능한 확장

- Extension 테스트
- `.vsix` 패키징
- 프로젝트별 설정과 SecretStorage
- Cursor 호환 검증

## 11. 기술 선택 결론

- **스킬**: 생성 규칙과 작업 순서를 제공한다.
- **CLI/서비스**: 이미지 생성, 파일 생성, 크롭, 검증, 배포를 실행한다.
- **VS Code Extension**: 큐, 소스, 미리보기, 승인 UI를 제공한다.

따라서 스킬만으로도 에이전트가 작업할 수 있고, 프로그램을 설치하면 사람이 같은 과정을 시각적으로 통제할 수 있다.

