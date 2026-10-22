/**
 * Anti-Slop 3-pass 카피 정제 (M9) — ah-my-marketing creative-design.md 이식.
 * Pass 1: AI 말투 제거  Pass 2: 슬롭 단어 삭제·구체화  Pass 3: 짧고 선명하게.
 * 결정적 규칙 기반(LLM 없이 동작). LLM 스왑인 시 이 함수를 후처리 프롬프트로 대체 가능.
 */

// Pass 1 — AI 말투 (연결어·과공손)
const PASS1: [RegExp, string][] = [
  [/\s*~?를?\s*통해서?\s*/g, " "],
  [/할\s*수\s*있습니다/g, "됩니다"],
  [/제공합니다/g, "드립니다"],
  [/하실\s*수\s*있어요/g, "하세요"],
  [/입니다만/g, "지만"],
];

// Pass 2 — 슬롭 단어 → 삭제 또는 구체화
const PASS2: [RegExp, string][] = [
  [/\b(seamless|끊김\s*없는)\b/gi, "매끄러운"],
  [/혁신적인\s*/g, ""],
  [/최첨단\s*/g, ""],
  [/강력한\s*/g, ""],
  [/게임\s*체인저/gi, ""],
  [/효율적으로/g, "더 빠르게"],
  [/다양한\s*/g, ""],
  [/최고의\s*/g, ""],
];

function collapseSpaces(s: string): string {
  return s.replace(/\s{2,}/g, " ").replace(/\s+([,.!?…])/g, "$1").trim();
}

export function antiSlop(input: string): { text: string; passes: number } {
  let text = input;
  let passes = 0;

  // Pass 1
  const p1 = text;
  for (const [re, rep] of PASS1) text = text.replace(re, rep);
  text = collapseSpaces(text);
  if (text !== p1) passes++;

  // Pass 2
  const p2 = text;
  for (const [re, rep] of PASS2) text = text.replace(re, rep);
  text = collapseSpaces(text);
  if (text !== p2) passes++;

  // Pass 3 — 수식어 중복 압축 + 길이 컷(선명하게)
  const p3 = text;
  text = text.replace(/(정말|진짜|아주|매우|너무)\s+(정말|진짜|아주|매우|너무)\s+/g, "$1 ");
  text = collapseSpaces(text);
  if (text !== p3) passes++;

  return { text, passes: Math.max(passes, 1) };
}
