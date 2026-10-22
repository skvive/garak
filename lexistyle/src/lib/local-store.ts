/**
 * 로컬 파일 DB — Docker/Neon 없이 `~/.lexi-local/data/lexi-local.json`에 영속화.
 * DATABASE_URL이 없을 때 catalog/import/pdp/export/assets 메모리 폴백이 사용.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import os from "os";

/** Dropbox 밖 고정 경로 — 동기화 잠금/UNKNOWN I/O 회피 */
const DATA_DIR =
  process.env.LOCAL_DATA_DIR || path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");
const ASSETS_DIR = path.join(DATA_DIR, "assets");

export function localDataDir() {
  return DATA_DIR;
}
export function localAssetsDir() {
  return ASSETS_DIR;
}

export type LocalStoreShape = {
  catalog?: unknown[];
  catalogCp?: unknown[];
  catalogRuns?: unknown[];
  catalogSeq?: number;
  assets?: unknown[];
  assetSeq?: number;
  importJobs?: unknown[];
  importSeq?: number;
  pdpDocs?: unknown[];
  pdpSeq?: number;
  exports?: unknown[];
  exportSeq?: number;
};

const g = globalThis as unknown as {
  __lexiLocalStore?: LocalStoreShape;
  __lexiLocalLoaded?: boolean;
  __lexiLocalTimer?: ReturnType<typeof setTimeout>;
};

export function localStore(): LocalStoreShape {
  if (!g.__lexiLocalLoaded) {
    try {
      const raw = readFileSync(STORE_PATH, "utf8");
      g.__lexiLocalStore = JSON.parse(raw) as LocalStoreShape;
    } catch {
      g.__lexiLocalStore = {};
    }
    g.__lexiLocalLoaded = true;
  }
  return g.__lexiLocalStore!;
}

export function scheduleLocalPersist() {
  clearTimeout(g.__lexiLocalTimer);
  g.__lexiLocalTimer = setTimeout(() => {
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(STORE_PATH, JSON.stringify(g.__lexiLocalStore ?? {}, null, 2), "utf8");
    } catch (e) {
      console.error("[local-store] persist failed", e);
    }
  }, 200);
}

export function reviveDates<T extends Record<string, unknown>>(row: T, keys: string[]): T {
  const out = { ...row };
  for (const k of keys) {
    const v = out[k];
    if (typeof v === "string") (out as Record<string, unknown>)[k] = new Date(v);
  }
  return out;
}
