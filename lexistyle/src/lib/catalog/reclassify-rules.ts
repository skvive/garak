/**
 * CJ 원본 분류 오류 보정 규칙 — 상품명 키워드로 하위 카테고리(leaf)를 다시 고른다.
 * 가져오기(import.ts)와 일괄 보정(scripts/reclassify-products.mjs)이 같은 규칙을 쓴다. 의존성 없는 순수 모듈.
 * - 의류 규칙은 의류 leaf(또는 한글 제목이 잡동사니 leaf에 든 경우)에 있는 상품에만 적용
 * - 남성 leaf 상품은 여성 표기가 있을 때만 이동, "남녀공용"·모자는 그대로 둔다
 */

export type LeafDef = { slug: string; name: string; dept: string };

/** CJ 택소노미에 없는, 재분류 전용 하위 카테고리 */
export const EXTRA_LEAVES: LeafDef[] = [
  { slug: "cj-home-decor", name: "홈데코·캔들", dept: "life" },
  { slug: "cj-hobby-games", name: "취미·게임", dept: "life" },
  { slug: "cj-hand-tools", name: "공구", dept: "life" },
  { slug: "cj-skin-care-fragrance", name: "스킨케어·향수", dept: "beauty" },
  { slug: "cj-drones-cameras", name: "드론·카메라", dept: "digital" },
];

const CLOTHING_LEAF = /^cj-(lady-dresses|blazers|basic-jacket|blouses-and-shirts|bras|panties|leggings|skirts|suits-and-sets|suits-and-blazer|sweaters|wide-leg-pants|casual-pants|shorts|womens-.+|woman-(shorts|trench|hoodies-and-sweatshirts|hats-and-caps)|wool-and-blend|rompers|eyewear-and-accessories|clutches|mens-hats-and-caps|mens-jackets)$/;
const MEN_LEAF = /^cj-(mens-|man-)/;
const isKo = (s: string) => /[가-힣]/.test(s);
const W = /\b(wom[ae]n'?s?|ladies|lady'?s?|girls?)\b|여성/i;
const MENW = /\bmen'?s?\b|\bmale\b|남성/i;
const HAT = /\b(hat|cap|beret|bowler|fedora)\b|모자/i;
const UNISEX = /men and women|unisex|men & women|남녀/i;

type Rule = [RegExp, string, RegExp?];

/** [정규식, 대상 leaf, 예외 정규식] — 위에서부터 첫 일치 */
const CLOTHING_RULES: Rule[] = [
  [/^(girls?|boys?)\b|\b(baby|toddler|children'?s?)\b/i, "cj-tops-and-tees"],
  [/swimsuit|bikini|swimwear|cover[- ]?up|커버업|수영복|비키니/i, "cj-bikini-sets"],
  [/nipple cover|breast sticker|bra stickers|\bbra\b|lingerie|(^|\s)브라(\s|$)|속옷/i, "cj-bras"],
  [/jumpsuit|romper|playsuit|점프수트|롬퍼/i, "cj-rompers"],
  [/\bdress\b(?!\s*(shirt|pants|shoes|up))|드레스|원피스/i, "cj-lady-dresses"],
  [/\b(co-?ord|two-?piece|2-?piece|tracksuit|set)\b|셋업|투피스|트랙 셋/i, "cj-suits-and-sets", /jewelry|necklace|bracelet|earring|pajama|sleep|lounge|storage/i],
  [/skirt|스커트|치마/i, "cj-skirts"],
  [/legging|yoga pants|biker shorts|레깅스|바이커 쇼츠/i, "cj-leggings"],
  [/cargo|work pants|카고/i, "cj-womens-cargo-pants"],
  [/wide[- ]leg|palazzo|와이드 ?팬츠/i, "cj-wide-leg-pants"],
  [/shorts|쇼츠/i, "cj-woman-shorts"],
  [/\bpants\b|trousers|slacks|팬츠|바지/i, "cj-casual-pants"],
  [/blazer|블레이저/i, "cj-blazers"],
  [/trench|트렌치/i, "cj-woman-trench"],
  [/vest\b|조끼|베스트/i, "cj-womens-vests", /sweater vest|knit vest/i],
  [/hoodie|sweatshirt|후디|맨투맨|스웨트/i, "cj-woman-hoodies-and-sweatshirts"],
  [/cardigan|sweater|knit|pullover|니트|가디건|풀오버/i, "cj-sweaters"],
  [/tube top|bustier|corset|strapless|뷔스티에|코르셋|튜브/i, "cj-womens-tube-tops"],
  [/camisole|\bcami\b|tank|sleeveless|민소매|캐미/i, "cj-womens-camis"],
  [/coat|jacket|parka|down\b|puffer|outerwear|코트|재킷|자켓/i, "cj-womens-outerwear"],
  [/blouse|shirt|top\b|블라우스|셔츠|티$|티셔츠|\btee\b/i, "cj-blouses-and-shirts"],
];

/** 비의류 규칙 — 세 번째 값은 "현재 leaf가 이럴 때만" 제한 */
const OTHER_RULES: Rule[] = [
  // 명절·시즌 장식이 먼저(홈데코로 되돌아가지 않도록 home-decor 도 대상에 포함)
  [/halloween|christmas|santa|pumpkin|snowman|turkey|day of the dead|wreath|snowflake/i, "cj-event-and-party-supplies", /^cj-(home-office-storage|led-spotlights|home-decor|event-and-party-supplies)$/],
  [/candle|diffuser|aromatherapy|fragrance/i, "cj-home-decor", /^cj-(home-office-storage|event-and-party-supplies)$/],
  [/wall (art|decor|sign|sticker)|ornament|statue|decorative|yard sign|ground stake|antique|key rack|wall-mounted|mermaid/i, "cj-home-decor", /^cj-(home-office-storage|event-and-party-supplies)$/],
  [/mahjong|crochet|knitting kit/i, "cj-hobby-games", /^cj-(home-office-storage|event-and-party-supplies)$/],
  [/screwdriver|wire cutter|stripper|tool kit/i, "cj-hand-tools", /^cj-home-electronic-accessories$/],
  [/refrigerator|defrost/i, "cj-home-appliance-parts", /^cj-home-electronic-accessories$/],
  [/drone|camera|webcam|live[- ]?streaming/i, "cj-drones-cameras", /^cj-(batteries|home-electronic-accessories|smart-home-appliances)$/],
  [/eye cream|gel\b|parfum|perfume|serum|cream\b/i, "cj-skin-care-fragrance", /^cj-face-skin-care-tools$/],
  [/yoga pants|leggings/i, "cj-leggings", /^cj-sports-accessories$/],
];

/** 상품명과 CJ가 준 leaf slug → 보정된 leaf slug. 바꿀 필요가 없으면 null */
export function reclassifyLeaf(name: string, leaf: string): string | null {
  let to: string | null = null;
  if (leaf === "cj-charger") to = "cj-chargers"; // 중복 leaf 통합
  let settled = to !== null;
  for (const [re, target, only] of OTHER_RULES) {
    if (settled) break;
    if (re.test(name) && only!.test(leaf)) {
      settled = true; // 첫 적용 규칙이 확정 — 이미 그 leaf 면 그대로 둔다(규칙끼리 되돌리지 않도록)
      if (target !== leaf) to = target;
    }
  }
  const clothingCtx = CLOTHING_LEAF.test(leaf) || (isKo(name) && /^cj-(boys-bags|clutches|cargo)/.test(leaf));
  const men = MEN_LEAF.test(leaf);
  if (
    !to && !settled && clothingCtx && !UNISEX.test(name) && !HAT.test(name) &&
    !(MENW.test(name) && !W.test(name)) && (!men || W.test(name))
  ) {
    for (const [re, target, except] of CLOTHING_RULES) {
      if (re.test(name) && !(except && except.test(name))) { to = target; break; }
    }
  }
  if (!to && leaf === "cj-boys-bags" && isKo(name)) to = "cj-woman-hoodies-and-sweatshirts";
  if (!to && leaf === "cj-boys-bags" && /kids|children/i.test(name)) to = "cj-backpacks-and-carriers";
  if (leaf === "cj-basic-jacket" && to === "cj-womens-outerwear") to = null; // 재킷↔아우터는 이동 불필요
  return to && to !== leaf ? to : null;
}
