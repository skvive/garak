// 더미 정리: demo-seoul catalog + 연결된 pdpDocs 제거. DeepSeek 생성문서 유지
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

const p = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const s = JSON.parse(readFileSync(p, "utf8"));

const oldCat = s.catalog.length;
const oldPdp = (s.pdpDocs ?? []).length;

// demo-seoul 제거
s.catalog = s.catalog.filter((c) => c.supplierCode !== "demo-seoul");
const rmCat = oldCat - s.catalog.length;

// 연결된 pdpDocs 제거 (demo-seoul 카탈로그 참조)
const validCatIds = new Set(s.catalog.map((c) => c.id));
s.pdpDocs = (s.pdpDocs ?? []).filter(
  (d) => !d.catalogId || validCatIds.has(d.catalogId) || d.engine === "deepseek",
);
const rmPdp = oldPdp - (s.pdpDocs ?? []).length;

// seq 리셋
delete s.catalogSeq;
delete s.pdpSeq;

writeFileSync(p, JSON.stringify(s, null, 2), "utf8");
console.log("catalog:", oldCat, "->", s.catalog.length, "( -" + rmCat + " )");
console.log("pdpDocs:", oldPdp, "->", (s.pdpDocs ?? []).length, "( -" + rmPdp + " )");
console.log("저장완료:", p);