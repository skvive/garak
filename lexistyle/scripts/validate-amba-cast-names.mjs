import fs from "node:fs/promises";
import path from "node:path";

const bundled = JSON.parse(await fs.readFile("amba/casts-registry.json", "utf8"));
const publicIndex = JSON.parse(await fs.readFile("public/casts/amba/index.json", "utf8"));
if (bundled.casts.length !== 101 || publicIndex.casts.length !== 101) throw new Error("Expected 101 casts");

const publicById = new Map(publicIndex.casts.map((cast) => [String(cast.id), cast]));
const seenByCountrySex = new Map();
for (const cast of bundled.casts) {
  const peer = publicById.get(String(cast.id));
  if (!peer || peer.name !== cast.name) throw new Error(`Registry mismatch: ${cast.id}`);
  const meta = JSON.parse(await fs.readFile(path.join("public", "casts", "amba", cast.folder, "meta.json"), "utf8"));
  if (meta.name !== cast.name) throw new Error(`Meta mismatch: ${cast.id}`);
  if (!cast.name.includes(" · ")) throw new Error(`Invalid bilingual name: ${cast.id}`);
  const key = `${cast.source.nat}:${cast.source.sex}`;
  const names = seenByCountrySex.get(key) || new Set();
  if (names.has(cast.name)) throw new Error(`Duplicate name in ${key}: ${cast.name}`);
  names.add(cast.name);
  seenByCountrySex.set(key, names);
}

console.log(JSON.stringify({ valid: true, casts: bundled.casts.length, groups: seenByCountrySex.size, metaFiles: bundled.casts.length }));
