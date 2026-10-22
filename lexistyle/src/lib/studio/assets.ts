/**
 * Studio 생성 — 이미지·아바타 스틸은 Wan 동기, 영상은 Wan 비동기 태스크.
 * docs/lexi-wan-maas.md. DB 없으면 메모리.
 */
import { desc, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db, hasDb, schema } from "@/db";
import { wanConfigured } from "@/lib/wan/config";
import { wanGetJson } from "@/lib/wan/client";
import { wanImageProvider } from "@/lib/wan/image";
import { generateWanTextToVideo, type WanVideoRatio } from "@/lib/wan/video";

export type StudioKind = "image" | "video" | "avatar";
export type StudioAsset = {
  id: number;
  ownerEmail: string;
  kind: StudioKind;
  prompt: string;
  status: "processing" | "completed" | "failed";
  resultUrl: string | null;
  taskId: string | null;
  error: string | null;
  createdAt: string;
};

const g = globalThis as unknown as { __studio?: Map<number, StudioAsset>; __studioSeq?: number };
const mem = () => (g.__studio ??= new Map());
const nextId = () => (g.__studioSeq = (g.__studioSeq ?? 0) + 1);

function rowTo(r: typeof schema.studioAssets.$inferSelect): StudioAsset {
  return {
    id: r.id,
    ownerEmail: r.ownerEmail,
    kind: r.kind as StudioKind,
    prompt: r.prompt,
    status: r.status as StudioAsset["status"],
    resultUrl: r.resultUrl,
    taskId: r.taskId,
    error: r.error,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

async function keep(url: string, kind: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return url;
    const blob = await put(`studio/${kind}/${crypto.randomUUID()}`, Buffer.from(await res.arrayBuffer()), {
      access: "public",
      contentType: res.headers.get("content-type") || (kind === "video" ? "video/mp4" : "image/png"),
    });
    return blob.url;
  } catch {
    return url;
  }
}

async function insert(a: Omit<StudioAsset, "id" | "createdAt">): Promise<StudioAsset> {
  if (!hasDb()) {
    const row: StudioAsset = { ...a, id: nextId(), createdAt: new Date().toISOString() };
    mem().set(row.id, row);
    return row;
  }
  const [r] = await db()
    .insert(schema.studioAssets)
    .values({
      ownerEmail: a.ownerEmail,
      kind: a.kind,
      prompt: a.prompt,
      status: a.status,
      resultUrl: a.resultUrl,
      taskId: a.taskId,
      error: a.error,
    })
    .returning();
  return rowTo(r);
}

async function patch(id: number, p: Partial<StudioAsset>) {
  if (!hasDb()) {
    const row = mem().get(id);
    if (row) Object.assign(row, p);
    return;
  }
  await db()
    .update(schema.studioAssets)
    .set({
      status: p.status,
      resultUrl: p.resultUrl,
      error: p.error,
    })
    .where(eq(schema.studioAssets.id, id));
}

export async function listAssets(email: string | null, scope: "mine" | "public"): Promise<StudioAsset[]> {
  if (!hasDb()) {
    const all = [...mem().values()].sort((a, b) => b.id - a.id);
    if (scope === "public") return all.filter((a) => a.status === "completed").slice(0, 24);
    return all.filter((a) => a.ownerEmail === email).slice(0, 40);
  }
  const t = schema.studioAssets;
  if (scope === "public") {
    const rows = await db().select().from(t).where(eq(t.status, "completed")).orderBy(desc(t.id)).limit(24);
    return rows.map(rowTo);
  }
  if (!email) return [];
  const rows = await db().select().from(t).where(eq(t.ownerEmail, email)).orderBy(desc(t.id)).limit(40);
  return rows.map(rowTo);
}

export async function getAsset(id: number): Promise<StudioAsset | null> {
  if (!hasDb()) return mem().get(id) ?? null;
  const [r] = await db().select().from(schema.studioAssets).where(eq(schema.studioAssets.id, id)).limit(1);
  return r ? rowTo(r) : null;
}

const RATIO: Record<string, WanVideoRatio> = { "16:9": "16:9", "9:16": "9:16", "1:1": "1:1" };

export async function createGeneration(email: string, kind: StudioKind, prompt: string, ratio: string): Promise<StudioAsset> {
  if (!wanConfigured()) {
    const err = new Error("이미지·영상 연결을 준비 중입니다.");
    (err as Error & { status?: number }).status = 503;
    throw err;
  }
  const text = prompt.trim().slice(0, 2000);
  if (text.length < 2) {
    const err = new Error("내용을 입력해 주세요.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  if (kind === "video") {
    const submitted = await generateWanTextToVideo(text, {
      wait: false,
      duration: 5,
      resolution: "720P",
      ratio: RATIO[ratio] ?? "16:9",
    });
    return insert({
      ownerEmail: email,
      kind,
      prompt: text,
      status: "processing",
      resultUrl: null,
      taskId: submitted.taskId,
      error: null,
    });
  }

  const size = kind === "avatar" || ratio === "9:16" ? "portrait" : ratio === "16:9" ? "landscape" : "square";
  const made = await wanImageProvider.textToImage(kind === "avatar" ? `Portrait photo, facing camera, ${text}` : text, { size });
  const url = await keep(made.url, kind);
  return insert({
    ownerEmail: email,
    kind,
    prompt: text,
    status: "completed",
    resultUrl: url,
    taskId: null,
    error: null,
  });
}

export async function refreshAsset(id: number, email: string): Promise<StudioAsset | null> {
  const row = await getAsset(id);
  if (!row || row.ownerEmail !== email) return null;
  if (row.status !== "processing" || !row.taskId) return row;
  try {
    const r = await wanGetJson(`/tasks/${row.taskId}`, 20_000);
    const out = (r.output as Record<string, unknown>) ?? {};
    const status = String(out.task_status ?? "");
    if (status === "SUCCEEDED" && out.video_url) {
      const url = await keep(String(out.video_url), "video");
      await patch(id, { status: "completed", resultUrl: url, error: null });
    } else if (status === "FAILED" || status === "CANCELED") {
      await patch(id, { status: "failed", error: String(out.message ?? status) });
    }
  } catch (e) {
    await patch(id, { status: "failed", error: e instanceof Error ? e.message : "poll failed" });
  }
  return getAsset(id);
}
