/**
 * AI 마케팅 피드 도메인 타입 — docs/lexi-ai-marketing-feed-upgrade.md
 * 이식원: ah-my-marketing(LMF·ICE·Hook), Amore_project(스토리보드), kekemind(시맨틱)
 */

/* ---------- ICE + 근거 레벨 (ah-my-marketing) ---------- */
export type EvidenceLevel = "Strong" | "Moderate" | "Emerging" | "Expert" | "Contested";

export type IceScore = {
  impact: number; // 1~10 TAM 도달
  confidence: number; // 1~10 근거 강도
  ease: number; // 1~10 제작 용이성
  evidence: EvidenceLevel;
  score: number; // (I+C+E)/3
};

/* ---------- Hook Lab 6유형 ---------- */
export type HookType = "PAIN" | "QUES" | "STAT" | "SOC" | "EMO" | "BENE";

export type Hook = {
  type: HookType;
  text: string;
  ice: IceScore;
  channel: string; // 추천 채널·포맷 (예: "메타 피드/IMG1x1")
};

/* ---------- LMF 카피 (Language Market Fit) ---------- */
export type Persona = {
  target: string;
  painPoint: string;
  currentAlternative: string;
  why: string;
};

export type ValuePromise = {
  code: string; // VP1, VP2 …
  axis: "차별화" | "문제해결" | "니즈만족";
  promise: string;
  customerLanguage: string; // 고객 언어 소구 문장
};

export type CopyVariant = {
  id: number;
  vpCode: string;
  headline: string;
  body: string;
  cta: string;
  ice: IceScore;
  antiSlopPasses: number; // 적용된 정제 패스 수
};

/* ---------- 스토리보드 (Amore_project 이식) ---------- */
export type Scene = {
  duration: number; // 정수 초
  imageIndex: number;
  overlayText: string; // 한글 포함, ≤15자
};

export type Storyboard = {
  brand?: string;
  bgmMood: string;
  scenes: Scene[];
  totalSeconds: number;
  valid: boolean; // 검증 통과 여부 (normalize 후 항상 true 보장)
  source: "ai" | "fallback" | "normalized";
};

/* ---------- 마케팅 자산 (생성물) ---------- */
export type MarketingAssetType = "hooks" | "copy" | "cardnews" | "reels" | "storyboard";

export type MarketingAsset = {
  id: number;
  listingId: number;
  type: MarketingAssetType;
  title: string;
  payload: Record<string, unknown>; // 훅 배열 / 카피 변형 / 슬라이드 / 스토리보드 JSON
  renderedHtml?: string; // 카드뉴스·릴스 미리보기 HTML
  renderUrl?: string; // 바이너리 렌더(PNG/MP4) 결과 (렌더 서비스가 채움)
  ice?: IceScore; // 대표 점수
  embedding?: number[]; // 시맨틱 검색용 512d 임베딩
  reviewState: "draft" | "approved" | "rejected";
  channelTargets: string[];
  aiModel: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
};

/* ---------- Compounding 학습 원장 (ah-my-marketing) ---------- */
export type MarketingLearning = {
  id: number;
  listingId?: number;
  category: string;
  vpCode?: string;
  appealText: string;
  customerLanguage: string;
  evidence: EvidenceLevel;
  impact: number;
  confidence: number;
  ease: number;
  outcome: "winner" | "rejected" | "pending";
  createdAt: string;
};

export type CampaignLogEntry = {
  id: number;
  listingId: number;
  assetId: number;
  channel: string; // coupang | sns | lexi …
  assetType: MarketingAssetType;
  iceScore: number;
  metrics: { impressions?: number; ctr?: number; cvr?: number };
  status: "published" | "paused" | "ended";
  publishedAt: string;
  createdAt: string;
};

/* ---------- 시맨틱 카테고리 (kekemind nearest-centroid) ---------- */
export type ContentCategory = {
  name: string;
  seeds: string[]; // 시드 구문 (centroid는 런타임 계산)
};
