import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { StudioError, type Product, type Order } from "./domain";

export type Shop = { id: string; shopId: string; name: string; region: string; tokens: string };
export type Workspace = { id: string; name: string; products: Product[]; shops: Shop[]; orders: Order[];
  audit: { at: string; action: string; detail: string }[]; oauth?: { hash: string; expires: number } };
type Database = { version: 1; workspaces: Record<string, Workspace> };
function filePath() {
  if (process.env.VERCEL || (process.env.NODE_ENV === "production" && !process.env.SELLER_STUDIO_DATA_DIR)) {
    throw new StudioError("Seller Studio 영속 저장소가 설정되지 않았습니다. 단일 서버의 SELLER_STUDIO_DATA_DIR을 설정하세요.", 503);
  }
  return path.join(process.env.SELLER_STUDIO_DATA_DIR || path.join(os.homedir(), ".lexi-local", "seller-studio"), "store.json");
}
export function workspaceId(actor: string) { return createHash("sha256").update(actor).digest("hex"); }
export function workspace(db: Database, actor: string): Workspace {
  const id = workspaceId(actor);
  return db.workspaces[id] ??= { id, name: "나의 Seller Studio", products: [], shops: [], orders: [], audit: [] };
}
async function readDatabase(file: string): Promise<Database> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Database;
    if (parsed.version !== 1 || !parsed.workspaces) throw new Error("unsupported store");
    return parsed;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, workspaces: {} };
    throw new StudioError("저장 파일을 읽을 수 없습니다. 기존 파일을 보존하고 관리자에게 확인하세요.", 503);
  }
}
export async function readWorkspace(actor: string) { return workspace(await readDatabase(filePath()), actor); }
export async function transact<T>(actor: string, fn: (w: Workspace, db: Database, checkpoint: () => Promise<void>) => Promise<T> | T): Promise<T> {
  const file = filePath();
  await mkdir(path.dirname(file), { recursive: true });
  const lock = file + ".lock";
  try { await mkdir(lock); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new StudioError("다른 작업이 처리 중입니다. 잠시 후 다시 시도하세요.", 409);
    throw e;
  }
  let tmp = "";
  try {
    const db = await readDatabase(file);
    const checkpoint = async () => {
      tmp = file + "." + randomUUID() + ".tmp";
      await writeFile(tmp, JSON.stringify(db), { mode: 0o600 });
      await rename(tmp, file);
      tmp = "";
    };
    const result = await fn(workspace(db, actor), db, checkpoint);
    await checkpoint();
    return result;
  } finally {
    if (tmp) await rm(tmp, { force: true });
    await rm(lock, { recursive: true });
  }
}
export function audit(w: Workspace, action: string, detail: string) {
  w.audit.unshift({ at: new Date().toISOString(), action, detail });
  w.audit = w.audit.slice(0, 500);
}
