#!/usr/bin/env node
/**
 * OpenRouter Free Tier Proxy for Cursor IDE
 *
 * 기능:
 * 1. OpenAI v1 호환 (/v1/chat/completions, /v1/models)
 * 2. 멀티 API 키 라운드로빈 및 429 Rate Limit 감지 시 자동 Failover
 * 3. 요청 모델을 OpenRouter 무료 모델군으로 자동 매핑
 * 4. 완벽한 SSE (Server-Sent Events) 스트리밍 중계
 */

import http from "node:http";

const PORT = process.env.PROXY_PORT || 8000;
const HOST = "127.0.0.1";

// 1. OpenRouter API 키 목록 (여러 계정 키를 쉼표로 구분하거나 배열에 추가)
const RAW_KEYS = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "";
const API_KEYS = RAW_KEYS.split(",")
  .map((k) => k.trim())
  .filter(Boolean);

// 기본 더미 키 (사용자가 키를 넣지 않았을 때 안내용)
if (API_KEYS.length === 0) {
  API_KEYS.push("sk-or-v1-YOUR_OPENROUTER_KEY_HERE");
}

// 2. 타깃 무료 모델 우선순위 (첫 번째 실패 시 다음 무료 모델로 폴백 가능)
const FREE_MODELS = [
  "openrouter/free", // OpenRouter 자체 무료 자동 라우터
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
];

let keyIndex = 0;
function getNextKey() {
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex++;
  return key;
}

const server = http.createServer(async (req, res) => {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. 모델 목록 엔드포인트 (/v1/models)
  if (req.url === "/v1/models" || req.url === "/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        object: "list",
        data: [
          { id: "openrouter/free", object: "model", owned_by: "openrouter" },
          { id: "openai/gpt-4o-mini", object: "model", owned_by: "proxy" },
          { id: "cursor-free", object: "model", owned_by: "proxy" },
          ...FREE_MODELS.map((id) => ({ id, object: "model", owned_by: "openrouter" })),
        ],
      }),
    );
    return;
  }

  // 2. 채팅 완성 엔드포인트 (/v1/chat/completions)
  if (req.url === "/v1/chat/completions" || req.url === "/chat/completions") {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(bodyText || "{}");
        const isStream = Boolean(payload.stream);

        // 요청 모델 유지 (openrouter/free는 폴백용)
        const requestedModel = payload.model || "openai/gpt-4o-mini";
        // DeepSeek v4 Flash 등 정확한 모델명은 그대로 OpenRouter에 전달
        const targetModel = requestedModel.includes("deepseek") || requestedModel.includes("/")
          ? requestedModel
          : "openrouter/free";

        payload.model = targetModel;

        console.log(
          `[Proxy] 요청 수신: Cursor(${requestedModel}) -> OpenRouter(${payload.model}) | stream=${isStream}`,
        );

        // 최대 3회 재시도 (키 교체 및 모델 폴백)
        let lastError = null;
        const isPaidModel = requestedModel.includes("deepseek");
        const maxAttempts = isPaidModel ? 1 : Math.min(API_KEYS.length * 2, 4);
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const currentKey = getNextKey();
          const keyShort = currentKey.slice(0, 10) + "...";

          try {
            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${currentKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://cursor.sh",
                "X-Title": "Cursor IDE Free Proxy",
              },
              body: JSON.stringify(payload),
            });

            // 429 Rate Limit 발생 시 다음 키/모델로 재시도
            if (orRes.status === 429) {
              console.warn(`[Proxy] 429 Rate Limit (Key: ${keyShort}) -> 다음 키로 재시도 중...`);
              // 모델도 다른 무료 모델로 스위칭 시도
              if (attempt > 0 && FREE_MODELS[attempt % FREE_MODELS.length]) {
                payload.model = FREE_MODELS[attempt % FREE_MODELS.length];
              }
              continue;
            }

            if (!orRes.ok) {
              const errText = await orRes.text();
              console.error(`[Proxy] OpenRouter 에러 [${orRes.status}]:`, errText);
              res.writeHead(orRes.status, { "Content-Type": "application/json" });
              res.end(errText);
              return;
            }

            // 정상 응답 스트리밍 전달
            if (isStream) {
              res.writeHead(200, {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              });

              const reader = orRes.body?.getReader();
              if (reader) {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
              }
              res.end();
              return;
            } else {
              const json = await orRes.json();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(json));
              return;
            }
          } catch (err) {
            lastError = err;
            console.error(`[Proxy] 연결 실패 (Key: ${keyShort}):`, err.message);
          }
        }

        // 모든 재시도 실패 시
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message: `모든 OpenRouter 무료 키/모델 요청 실패: ${lastError?.message || "Rate limit or network error"}`,
            },
          }),
        );
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: e.message } }));
      }
    });
    return;
  }

  // 404 Fallback
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: "Not found. Use /v1/chat/completions" } }));
});

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Cursor OpenRouter Free Proxy 실행 중!`);
  console.log(`📡 URL: http://${HOST}:${PORT}/v1`);
  console.log(`🔑 등록된 API 키 수: ${API_KEYS.length}개`);
  console.log(`🎯 타깃 무료 모델: ${FREE_MODELS[0]}`);
  console.log(`=======================================================`);
});
