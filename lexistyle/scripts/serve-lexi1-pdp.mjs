import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "out", "lexi1-pdp");
const port = 8768;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    const raw = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = raw === "/" ? "/index.html" : raw;
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
