import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const dir = join(dirname(fileURLToPath(import.meta.url)), "out", "lexi-knit-promo");
const port = 8767;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    const raw = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = raw === "/" ? "/preview.html" : raw;
    const abs = join(dir, rel.replace(/^\//, ""));
    if (!abs.startsWith(dir) || !existsSync(abs)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = extname(abs).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(readFileSync(abs));
  })
  .listen(port, "127.0.0.1", () => console.log(`READY http://127.0.0.1:${port}/`));
