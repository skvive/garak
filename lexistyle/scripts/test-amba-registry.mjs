// scripts/test-amba-registry.mjs — AMBA Registry 로드 테스트

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

console.log("=== AMBA Registry Load Test ===");
console.log("Root directory:", ROOT_DIR);

try {
  const registryPath = join(ROOT_DIR, "amba", "registry.json");
  console.log("Registry path:", registryPath);

  const exists = await import("fs").then(fs => fs.existsSync(registryPath));
  console.log("File exists:", exists);

  if (!exists) {
    throw new Error(`Registry not found at ${registryPath}`);
  }

  const content = await readFile(registryPath, "utf8");
  const data = JSON.parse(content);

  console.log("\n✓ Registry loaded successfully!");
  console.log("  - Count:", data.count);
  console.log("  - Agency:", data.agency);
  console.log("  - Generated at:", data.generatedAt);

  // 샘플 모델 정보 출력
  if (data.models.length > 0) {
    const sample = data.models[0];
    console.log("\n  Sample model:");
    console.log("    ID:", sample.id);
    console.log("    Name:", sample.name);
    console.log("    Nationality:", sample.nationalityLabel);
    console.log("    Gender:", sample.gender);
    console.log("    Style:", sample.style);
    console.log("    Public path:", sample.publicPath);
  }

  // 성별 분포
  const genderCount = {};
  data.models.forEach(m => {
    genderCount[m.gender] = (genderCount[m.gender] || 0) + 1;
  });
  console.log("\n  Gender distribution:", genderCount);

  // 국적 수
  const uniqueNationalities = [...new Set(data.models.map(m => m.nationality))];
  console.log("  Unique nationalities:", uniqueNationalities.length);

  // 스타일 분포
  const styleCount = {};
  data.models.forEach(m => {
    styleCount[m.style] = (styleCount[m.style] || 0) + 1;
  });
  console.log("  Style distribution:", styleCount);

  console.log("\n✅ All checks passed!");

} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}