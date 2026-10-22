/**
 * AMBA cast library — SAMPLE3 modelCast face seeds
 * Index: public/casts/amba/index.json
 *
 * Vercel serverless는 런타임에 `public/` 파일을 `process.cwd()`로 읽지 못하므로,
 * 빌드 시 번들되는 `amba/casts-registry.json`(git 추적됨)을 1차 소스로 사용한다.
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import castsRegistry from "../../../amba/casts-registry.json";

export type AmbaCast = {
  id: string;
  name: string;
  gender: string;
  nationality: string;
  interests: string[];
  agency: "AMBA";
  agencyFull: string;
  faceSeed: string;
  folder: string;
  publicPath: string;
  metaPath: string;
  source: {
    lookbookId: string;
    eth: string;
    nat: string;
    sex: string;
    age: string;
    style: string;
    file: string;
  };
};

export type ModelCastProfile = {
  id?: string;
  name: string;
  gender: string;
  nationality: string;
  interests: string[];
  agency: "AMBA";
  agencyFull: "AI Ambassador";
  faceSeed: string;
  castFolder?: string;
};

let cached: AmbaCast[] | null = null;

function indexPath(cwd = process.cwd()) {
  return path.join(cwd, "public", "casts", "amba", "index.json");
}

export function listAmbaCasts(cwd = process.cwd()): AmbaCast[] {
  if (cached) return cached;

  // 1) 번들된 레지스트리 우선 (Vercel serverless에서 fs 접근 없이 동작)
  const bundled = (castsRegistry as { casts?: AmbaCast[] }).casts;
  if (bundled && bundled.length) {
    cached = bundled;
    return cached;
  }

  // 2) 폴백: 런타임 fs 읽기 (로컬 dev / 스크립트)
  const p = indexPath(cwd);
  if (!existsSync(p)) return [];
  const raw = JSON.parse(readFileSync(p, "utf8")) as { casts?: AmbaCast[] };
  cached = raw.casts ?? [];
  return cached;
}

export type CastPickOpts = {
  sex?: "F" | "M";
  nat?: string;
  eth?: string;
  style?: string;
  /** prefer adult fashion bands */
  age?: string;
  id?: string;
};

export function pickAmbaCast(opts: CastPickOpts = {}, cwd = process.cwd()): AmbaCast | null {
  const all = listAmbaCasts(cwd);
  if (!all.length) return null;
  if (opts.id) {
    const hit = all.find((c) => c.id === opts.id || c.source?.lookbookId === opts.id);
    if (hit) return hit;
  }
  let pool = all;
  if (opts.sex) pool = pool.filter((c) => c.source?.sex === opts.sex);
  if (opts.nat) pool = pool.filter((c) => c.source?.nat === opts.nat);
  if (opts.eth) pool = pool.filter((c) => c.source?.eth === opts.eth);
  if (opts.style) pool = pool.filter((c) => c.source?.style === opts.style);
  if (opts.age) pool = pool.filter((c) => c.source?.age === opts.age);
  if (!pool.length) {
    // relax style then eth
    pool = all;
    if (opts.sex) pool = pool.filter((c) => c.source?.sex === opts.sex);
    if (opts.nat) pool = pool.filter((c) => c.source?.nat === opts.nat);
  }
  return pool[0] ?? all[0] ?? null;
}

/** SAMPLE3 modelCast block for customer page + faceSeed path for image gen */
export function toModelCast(cast: AmbaCast): ModelCastProfile {
  return {
    id: cast.id,
    name: cast.name,
    gender: cast.gender,
    nationality: cast.nationality,
    interests: cast.interests,
    agency: "AMBA",
    agencyFull: "AI Ambassador",
    faceSeed: cast.publicPath,
    castFolder: cast.folder,
  };
}

/** Absolute filesystem path to face.webp for image generators */
export function castFaceFsPath(cast: AmbaCast, cwd = process.cwd()): string {
  return path.join(cwd, "public", "casts", "amba", cast.folder, "face.webp");
}
