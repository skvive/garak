import {pickAmbaCast, listAmbaCasts} from '../src/lib/pdp/amba-casts';
import type {AmbaCast} from '../src/lib/pdp/amba-casts';

function matchModelForProduct(row: any, casts: AmbaCast[]): AmbaCast | null {
  if (!casts.length) return null;
  const catPath = (row.categoryPath ?? []).join(" ");
  const title = (row.title ?? "").toLowerCase();
  const sex = "F"; // fashion default: female model

  let pool = casts.filter((c) => c.source?.sex === sex);
  if (!pool.length) pool = casts;
  const ea = pool.filter((c) => c.source?.eth === "EA");
  if (ea.length > 0) pool = ea;

  const idx = row.id ? Number(row.id) % pool.length : 0;
  return pool[idx] ?? casts[0] ?? null;
}

const tests = [
  {id: 20, title: "Women's Dress", cat: ["Lady Dresses"]},
  {id: 29, title: "Men's T-Shirt", cat: ["Casual Tops"]},
  {id: 30, title: "Fashion Blouse", cat: ["Blouses"]},
];
const casts = listAmbaCasts();
for (const row of tests) {
  const r = matchModelForProduct(row, casts);
  console.log(`${row.title}: ${r?.name} (${r?.source?.sex})`);
}