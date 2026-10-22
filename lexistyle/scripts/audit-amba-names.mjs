import fs from "node:fs/promises";

const registry = JSON.parse(await fs.readFile("amba/casts-registry.json", "utf8"));
const rows = registry.casts.map((cast) => ({
  id: cast.id,
  name: cast.name,
  nationality: cast.nationality,
  nat: cast.source.nat,
  sex: cast.source.sex,
}));
const counts = {};
for (const row of rows) {
  const key = `${row.nat}/${row.nationality}/${row.sex}`;
  counts[key] = (counts[key] || 0) + 1;
}
console.log(JSON.stringify({ total: rows.length, counts, rows }, null, 2));
