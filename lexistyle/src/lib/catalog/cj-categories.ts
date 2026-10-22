/**
 * CJ Dropshipping 공식 1단 카테고리 (CJEC 사이드바 14종).
 * 카탈로그 category_path 의 세분/영문 별칭을 이 14개(+기타)로 접는다.
 */
import { sql, type SQL } from "drizzle-orm";

export const CJ_OTHER = "기타";

export const CJ_TOP_CATEGORIES = [
  { id: "women-clothing", ko: "여성 의류" },
  { id: "pet", ko: "애완용품" },
  { id: "home-garden", ko: "홈, 가든 & 가구" },
  { id: "beauty", ko: "건강, 미용 및 헤어" },
  { id: "jewelry", ko: "보석 및 시계" },
  { id: "men-clothing", ko: "남성 의류" },
  { id: "bags-shoes", ko: "가방 및 신발" },
  { id: "kids", ko: "장난감, 어린이 및 유아용품" },
  { id: "sports", ko: "스포츠 및 아웃도어" },
  { id: "electronics", ko: "소비자 가전제품" },
  { id: "home-improve", ko: "주택 개량" },
  { id: "auto", ko: "자동차 및 오토바이" },
  { id: "phones", ko: "휴대폰 및 액세서리" },
  { id: "computers", ko: "컴퓨터 및 사무용품" },
] as const;

export type CjTopKo = (typeof CJ_TOP_CATEGORIES)[number]["ko"] | typeof CJ_OTHER;

/** 먼저 매칭된 규칙이 이긴다. 휴대폰·컴퓨터는 가전보다 앞. */
export const CJ_CATEGORY_RULES: { ko: CjTopKo; re: string }[] = [
  { ko: "휴대폰 및 액세서리", re: "\\b(smart)?phones?\\b|iphone|android|telecom|cell[\\s-]?phone" },
  { ko: "컴퓨터 및 사무용품", re: "computer|laptop|notebook|office|printer|stationery|keyboard|monitor" },
  { ko: "자동차 및 오토바이", re: "\\bauto(mobile)?s?\\b|\\bmotorcycles?\\b|\\bmotorbikes?\\b|\\bvehicles?\\b|\\bcars?\\b" },
  { ko: "주택 개량", re: "improvement|hardware|lighting|electrical|plumbing|drill|paint" },
  { ko: "소비자 가전제품", re: "electron|appliance|gadget|camera|headphone|earbud|audio|television|\\btv\\b" },
  { ko: "스포츠 및 아웃도어", re: "sport|outdoor|fitness|yoga|camping|bicycle|bike" },
  { ko: "장난감, 어린이 및 유아용품", re: "toy|kid|baby|infant|child|maternity|toddler" },
  { ko: "가방 및 신발", re: "bag|shoe|sandal|sneaker|boot|backpack|handbag|wallet|footwear" },
  { ko: "보석 및 시계", re: "jewel|watch|necklace|earring|bracelet|\\bring\\b|accessor" },
  { ko: "남성 의류", re: "\\bmen\\b|\\bmens\\b|\\bmale\\b|gentleman" },
  { ko: "여성 의류", re: "\\bwomen\\b|\\bladies\\b|\\blady\\b|\\bfemale\\b|dress|skirt|blouse|fashion|apparel|clothing" },
  { ko: "애완용품", re: "\\bpet\\b|dog|cat|puppy|kitten|aquarium" },
  { ko: "건강, 미용 및 헤어", re: "beauty|health|hair|cosmetic|makeup|skincare|skin care|wellness" },
  { ko: "홈, 가든 & 가구", re: "home|garden|furniture|kitchen|household|decor|lamp" },
];

const KO_SET = new Set<string>([...CJ_TOP_CATEGORIES.map((c) => c.ko), CJ_OTHER]);

export function mapCjCategory(path: string[] | null | undefined): CjTopKo {
  const parts = (path ?? []).map((s) => String(s || "").trim()).filter(Boolean);
  if (!parts.length) return CJ_OTHER;
  const first = parts[0]!;
  if (KO_SET.has(first)) return first as CjTopKo;
  const blob = parts.join(" ");
  for (const rule of CJ_CATEGORY_RULES) {
    if (new RegExp(rule.re, "i").test(blob)) return rule.ko;
  }
  return CJ_OTHER;
}

export function collapseCjCategories(rows: { name: string; count: number }[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const name = mapCjCategory([r.name]);
    map.set(name, (map.get(name) ?? 0) + r.count);
  }
  const order = [...CJ_TOP_CATEGORIES.map((c) => c.ko), CJ_OTHER];
  return order
    .filter((name) => (map.get(name) ?? 0) > 0)
    .map((name) => ({ name, count: map.get(name)! }));
}

/** Postgres: category_path 전체를 공식 1단 한글 라벨로. */
export function cjCanonicalSql(categoryPathCol: unknown): SQL<string> {
  const blob = sql`lower(array_to_string(coalesce(${categoryPathCol as SQL}, ARRAY[]::text[]), ' '))`;
  // PG 배열은 1-based — [1]이 첫 요소 (ko 정본 매칭용)
  const first = sql`coalesce(${categoryPathCol as SQL}[1], '')`;
  const exact = sql.join(
    [...CJ_TOP_CATEGORIES.map((c) => c.ko), CJ_OTHER].map((ko) => sql`${ko}`),
    sql`, `,
  );
  const whens = CJ_CATEGORY_RULES.map((r) => sql`WHEN ${blob} ~* ${r.re} THEN ${r.ko}`);
  return sql<string>`CASE WHEN ${first} IN (${exact}) THEN ${first} ${sql.join(whens, sql` `)} ELSE ${CJ_OTHER} END`;
}
