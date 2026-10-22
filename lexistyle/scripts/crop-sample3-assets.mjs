import sharp from "sharp";

const dirs = process.argv.slice(2);
if (!dirs.length) throw new Error("Pass one or more asset directories");

await Promise.all(dirs.flatMap((dir) => {
  const source = `${dir}/hero-source-v1.png`;
  return [
    sharp(source).resize(960, 1200, { fit: "cover", position: "centre" }).webp({ quality: 84, effort: 6 }).toFile(`${dir}/hero-v1.webp`),
    sharp(source).resize(900, 900, { fit: "cover", position: "north" }).webp({ quality: 82, effort: 6 }).toFile(`${dir}/detail-v1.webp`),
    sharp(source).resize(960, 1200, { fit: "cover", position: "centre" }).webp({ quality: 82, effort: 6 }).toFile(`${dir}/silhouette-v1.webp`),
    sharp(source).resize(1200, 630, { fit: "cover", position: "north" }).webp({ quality: 80, effort: 6 }).toFile(`${dir}/og-v1.webp`),
  ];
}));

console.log(`cropped ${dirs.length} SAMPLE3 heroes`);
