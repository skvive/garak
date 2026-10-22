import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const dir = dirname(fileURLToPath(import.meta.url));
const file = join(dir, ".sample-pdp-preview.html");
const assetsRoot = join(os.homedir(), ".lexi-local", "data", "assets");
const port = 8766;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (url.startsWith("/api/local-media/")) {
      const rel = url.slice("/api/local-media/".length);
      const abs = normalize(join(assetsRoot, rel));
      if (!abs.startsWith(assetsRoot) || !existsSync(abs)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = abs.slice(abs.lastIndexOf(".")).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(abs));
      return;
    }
    const html = readFileSync(file, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`READY http://127.0.0.1:${port}/`);
    console.log(`ASSETS ${assetsRoot}`);
  });
