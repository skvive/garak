#!/usr/bin/env node
/**
 * Coupang IP 허용목록 우회용 로컬 릴레이.
 * Coupang Wing OpenAPI가 특정 IP만 허용해서 Vercel(가변 IP)에서 직접 호출이 막힐 때,
 * 이 서버를 고정 IP가 있는 곳(로컬 PC/VPS)에서 돌리고 Vercel이 이걸 거쳐 가게 한다.
 * 서명(HMAC)은 coupang.ts가 그대로 계산해서 보내므로, 이 릴레이는 그 요청을
 * 그대로 api-gateway.coupang.com에 전달만 하는 투명 프록시다.
 *
 * 실행: COUPANG_RELAY_SECRET=<임의값> node scripts/coupang-relay.js [port=8787]
 * 그 다음 cloudflared로 공개 URL을 뽑아서 Vercel env COUPANG_RELAY_URL/COUPANG_RELAY_SECRET에 등록.
 */
const http = require("http");
const https = require("https");

const PORT = Number(process.argv[2] || process.env.PORT || 8787);
const SECRET = process.env.COUPANG_RELAY_SECRET;
const TARGET_HOST = "api-gateway.coupang.com";

if (!SECRET) {
  console.error("COUPANG_RELAY_SECRET env var required");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.headers["x-relay-secret"] !== SECRET) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    delete forwardHeaders["x-relay-secret"];
    delete forwardHeaders["content-length"];

    const upstream = https.request(
      {
        host: TARGET_HOST,
        method: req.method,
        path: req.url,
        headers: { ...forwardHeaders, "content-length": body.length },
      },
      (upRes) => {
        res.writeHead(upRes.statusCode || 502, upRes.headers);
        upRes.pipe(res);
      },
    );
    upstream.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `relay upstream: ${err.message}` }));
    });
    upstream.end(body);
  });
});

server.listen(PORT, () => {
  console.log(`coupang relay listening on :${PORT} -> https://${TARGET_HOST}`);
});
