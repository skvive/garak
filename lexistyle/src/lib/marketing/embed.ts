/**
 * 시맨틱 레이어 (M8) — kekemind 이식.
 *
 * 런타임 전략(스펙 §1.4, §6):
 *  - EMBED_SERVICE_URL 설정 시: FastAPI 임베딩 사이드카(services/embedding) 호출
 *    → 한국어 static 임베딩(kor-static-embedding-512, 512d).
 *  - 미설정 시: 결정적 로컬 폴백 임베딩(해시 n-gram BoW → L2 정규화).
 *    키/서비스 없이도 분류·검색·클러스터가 동작한다 (CJ mock 폴백과 동일 철학).
 *
 * 벡터는 항상 L2 정규화 → cosine == dot product (kekemind와 동일 불변식).
 * 저장은 현행 HQ 스냅샷 스토어(배열) + TS cosine. pgvector는 프로덕션 확장 경로.
 */
import type { ContentCategory } from "./types";

export const EMBED_DIM = 512;

/* ---------- 결정적 로컬 폴백 임베딩 ---------- */
function hashToken(tok: string): number {
  let h = 2166136261;
  for (let i = 0; i < tok.length; i++) {
    h ^= tok.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % EMBED_DIM;
}

/**
 * 폴백 토큰화: 온전한 단어(가중 2) + 문자 2/3-gram(가중 1).
 * 한글은 띄어쓰기·어미 변화가 많아 char n-gram이 형태 유사도를 살린다
 * (예: "수분 세럼" ↔ "스킨케어 세럼 보습" 은 bigram "세럼"으로 연결).
 */
function tokenize(text: string): { tok: string; w: number }[] {
  const norm = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!norm) return [];
  const out: { tok: string; w: number }[] = [];
  for (const word of norm.split(/\s+/)) {
    if (word.length >= 2) out.push({ tok: `w:${word}`, w: 2 });
  }
  const compact = norm.replace(/\s+/g, "");
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= compact.length; i++) out.push({ tok: compact.slice(i, i + n), w: 1 });
  }
  return out;
}

function localEmbed(text: string): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  for (const { tok, w } of tokenize(text)) v[hashToken(tok)] += w;
  return l2normalize(v);
}

export function l2normalize(v: number[]): number[] {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return v.map((x) => x / n);
}

/* ---------- 임베딩 (사이드카 우선, 폴백) ---------- */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const url = process.env.EMBED_SERVICE_URL;
  if (url) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const j = (await res.json()) as { embeddings: number[][] };
        if (Array.isArray(j.embeddings) && j.embeddings.length === texts.length) {
          return j.embeddings.map(l2normalize);
        }
      }
    } catch {
      /* 폴백으로 진행 */
    }
  }
  return texts.map(localEmbed);
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}

/* ---------- 유사도 ---------- */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s; // 정규화 벡터 → dot == cosine
}

/* ---------- 최근접 centroid 분류 (kekemind /api/analyze) ---------- */
export async function classify(
  text: string,
  categories: ContentCategory[],
  topN = 3,
): Promise<{ name: string; score: number }[]> {
  if (categories.length === 0) return [];
  const emb = await embedOne(text);
  const centroids = await Promise.all(
    categories.map(async (c) => {
      const seedVecs = await embed(c.seeds.length ? c.seeds : [c.name]);
      const mean = new Array(EMBED_DIM).fill(0);
      for (const sv of seedVecs) for (let i = 0; i < EMBED_DIM; i++) mean[i] += sv[i];
      for (let i = 0; i < EMBED_DIM; i++) mean[i] /= seedVecs.length || 1;
      return { name: c.name, vec: l2normalize(mean) };
    }),
  );
  return centroids
    .map((c) => ({ name: c.name, score: +cosine(emb, c.vec).toFixed(4) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/* ---------- 시맨틱 검색 (kekemind /api/recall → 서버측 top-K) ---------- */
export async function semanticSearch<T extends { embedding?: number[] }>(
  query: string,
  items: T[],
  topK = 10,
): Promise<{ item: T; score: number }[]> {
  const q = await embedOne(query);
  return items
    .filter((it) => Array.isArray(it.embedding) && it.embedding.length > 0)
    .map((it) => ({ item: it, score: +cosine(q, it.embedding!).toFixed(4) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/* ---------- centroid 추출 요약 (kekemind /api/summarize) ---------- */
export function summarizeCentroid(
  texts: string[],
  embeddings: number[][],
  n = 5,
): string[] {
  if (texts.length <= n) return texts;
  const centroid = new Array(EMBED_DIM).fill(0);
  for (const e of embeddings) for (let i = 0; i < EMBED_DIM; i++) centroid[i] += e[i];
  const c = l2normalize(centroid);
  return texts
    .map((t, i) => ({ t, i, s: cosine(embeddings[i], c) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .sort((a, b) => a.i - b.i) // 원래 순서 복원
    .map((x) => x.t);
}

/* ---------- KMeans-lite 클러스터 (kekemind /api/patterns) ---------- */
export function clusterKMeans(
  embeddings: number[][],
  k: number,
  iters = 12,
): number[] {
  const n = embeddings.length;
  if (n === 0) return [];
  k = Math.max(1, Math.min(k, n));
  // 결정적 초기화: 균등 간격 시드 (Math.random 미사용 — 재현성/스냅샷 안전)
  let centers = Array.from({ length: k }, (_, i) => embeddings[Math.floor((i * n) / k)].slice());
  const assign = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < n; i++) {
      let best = 0, bestS = -Infinity;
      for (let c = 0; c < k; c++) {
        const s = cosine(embeddings[i], centers[c]);
        if (s > bestS) { bestS = s; best = c; }
      }
      assign[i] = best;
    }
    const next = Array.from({ length: k }, () => new Array(EMBED_DIM).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      counts[assign[i]]++;
      const e = embeddings[i];
      for (let d = 0; d < EMBED_DIM; d++) next[assign[i]][d] += e[d];
    }
    centers = next.map((v, c) => (counts[c] ? l2normalize(v) : centers[c]));
  }
  return assign;
}

/** 클러스터 → 대표 인덱스 + 빈도 키워드 */
export function clusterSummary(
  texts: string[],
  embeddings: number[][],
  assign: number[],
  minSize = 2,
): { members: number[]; representative: number; keywords: string[] }[] {
  const byCluster = new Map<number, number[]>();
  assign.forEach((c, i) => byCluster.set(c, [...(byCluster.get(c) ?? []), i]));
  const out: { members: number[]; representative: number; keywords: string[] }[] = [];
  for (const members of byCluster.values()) {
    if (members.length < minSize) continue;
    const center = new Array(EMBED_DIM).fill(0);
    for (const i of members) for (let d = 0; d < EMBED_DIM; d++) center[d] += embeddings[i][d];
    const c = l2normalize(center);
    let rep = members[0], repS = -Infinity;
    for (const i of members) {
      const s = cosine(embeddings[i], c);
      if (s > repS) { repS = s; rep = i; }
    }
    out.push({ members, representative: rep, keywords: topKeywords(members.map((i) => texts[i])) });
  }
  return out.sort((a, b) => b.members.length - a.members.length);
}

const STOP = new Set(["그리고", "하지만", "그래서", "이것", "저것", "합니다", "있는", "위한", "통해", "때문", "정말", "너무", "가장", "the", "and", "for", "with", "your"]);

export function topKeywords(texts: string[], topN = 5): string[] {
  const freq = new Map<string, number>();
  for (const t of texts) {
    const toks = t.toLowerCase().match(/[\p{L}\p{N}]{2,12}/gu) ?? [];
    for (const tok of toks) {
      if (STOP.has(tok)) continue;
      freq.set(tok, (freq.get(tok) ?? 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map((x) => x[0]);
}
