/**
 * 한글 검색어 확장 — 상품명은 CJ 영문 원문이 많아 "원피스" 같은 한글로는 name 매칭이 안 된다.
 * 카테고리명(한글)은 DB에서 직접 매칭하고, 여기서는 일상 한글 단어 → 영문 상품명 단어로 확장한다.
 */

/** 한글 일반어 → 상품명에 실제로 들어가는 영문 단어 */
const KO_TO_EN: Record<string, string[]> = {
  원피스: ["dress"], 드레스: ["dress"], 미니원피스: ["dress"], 맥시: ["maxi"],
  스커트: ["skirt"], 치마: ["skirt"], 바지: ["pants", "trousers"], 팬츠: ["pants"], 슬랙스: ["pants", "trousers"],
  청바지: ["jeans", "denim"], 데님: ["denim"], 반바지: ["shorts"], 쇼츠: ["shorts"], 레깅스: ["leggings"],
  티셔츠: ["t-shirt", "tee"], 셔츠: ["shirt"], 블라우스: ["blouse"], 상의: ["top"], 탑: ["top"], 민소매: ["sleeveless", "tank", "vest"],
  니트: ["knit", "sweater"], 스웨터: ["sweater"], 가디건: ["cardigan"], 후드: ["hoodie"], 맨투맨: ["sweatshirt"], 후드티: ["hoodie"],
  코트: ["coat"], 트렌치: ["trench"], 재킷: ["jacket"], 자켓: ["jacket"], 블레이저: ["blazer"], 점퍼: ["jacket"], 패딩: ["padded", "down"],
  점프수트: ["jumpsuit", "romper"], 세트: ["set", "suit"], 수트: ["suit"], 투피스: ["two-piece"], 커버업: ["cover-up", "cover up"],
  수영복: ["swimsuit", "bikini", "swimwear"], 비키니: ["bikini"], 브라: ["bra"], 속옷: ["underwear", "bra", "panties"], 팬티: ["panties"],
  잠옷: ["pajama"], 파자마: ["pajama"], 양말: ["sock"], 스타킹: ["stockings"],
  가방: ["bag"], 백팩: ["backpack"], 토트백: ["tote"], 크로스백: ["crossbody"], 클러치: ["clutch"], 지갑: ["wallet"], 파우치: ["pouch"], 캐리어: ["luggage", "suitcase"],
  신발: ["shoe", "shoes"], 운동화: ["sneaker", "running shoes"], 스니커즈: ["sneaker"], 샌들: ["sandal"], 부츠: ["boot", "boots"], 슬리퍼: ["slipper"], 힐: ["heel", "pump"],
  모자: ["hat", "cap"], 벨트: ["belt"], 스카프: ["scarf"], 장갑: ["glove"], 안경: ["glasses", "eyewear"], 선글라스: ["sunglasses"],
  목걸이: ["necklace", "pendant", "choker"], 팔찌: ["bracelet", "bangle"], 반지: ["ring"], 귀걸이: ["earring"], 이어링: ["earring"], 주얼리: ["jewelry", "jewellery"], 시계: ["watch"], 브로치: ["brooch"],
  실버: ["silver"], 골드: ["gold"], 진주: ["pearl"], 레이스: ["lace"], 체크: ["plaid", "check"], 스트라이프: ["striped", "stripe"], 플로럴: ["floral"], 도트: ["polka"], 자수: ["embroider"],
  충전기: ["charger"], 케이블: ["cable"], 보조배터리: ["power bank"], 케이스: ["case"], 거치대: ["holder", "stand"], 이어폰: ["earphone", "earbud"], 스피커: ["speaker"],
  조명: ["light", "lamp"], 램프: ["lamp"], 쿠션: ["cushion", "pillow"], 베개: ["pillow"], 침구: ["bedding", "duvet"], 커튼: ["curtain"], 수납: ["storage"], 향초: ["candle"], 캔들: ["candle"], 매트: ["mat"],
  강아지: ["dog", "pet"], 고양이: ["cat", "pet"], 반려동물: ["pet"], 장난감: ["toy"], 인형: ["doll", "plush"], 피규어: ["figure"],
  캠핑: ["camping"], 등산: ["hiking"], 자전거: ["bicycle", "bike"], 낚시: ["fishing"], 요가: ["yoga"], 러닝: ["running"],
  자동차: ["car", "vehicle"], 오토바이: ["motorcycle"], 네일: ["nail"], 가발: ["wig"], 메이크업: ["makeup"], 마스크: ["mask"],
  흰색: ["white"], 화이트: ["white"], 검정: ["black"], 검은색: ["black"], 블랙: ["black"], 빨강: ["red"], 레드: ["red"], 파랑: ["blue"], 블루: ["blue"],
  핑크: ["pink"], 분홍: ["pink"], 베이지: ["beige", "apricot"], 회색: ["gray", "grey"], 그레이: ["gray", "grey"], 카키: ["khaki"], 네이비: ["navy"], 브라운: ["brown", "coffee"],
  초록: ["green"], 그린: ["green"], 노랑: ["yellow"], 옐로우: ["yellow"], 보라: ["purple"], 퍼플: ["purple"], 오렌지: ["orange"], 아이보리: ["ivory", "cream"],
  여성: ["women", "womens", "lady"], 남성: ["men", "mens", "man"], 아동: ["kids", "children", "boys", "girls"], 키즈: ["kids", "children"],
};

/** 검색어를 공백 기준 토큰으로 나눈다 (최대 6개, 1글자 영문 토큰은 제외) */
export function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !(t.length === 1 && /[a-z0-9]/.test(t)))
    .slice(0, 6);
}

/** 토큰 하나의 매칭 후보: [원문, ...영문 확장어]. 한글 단어가 사전 단어를 포함하면 해당 확장어를 추가한다. */
export function expandToken(token: string): string[] {
  const out = new Set<string>([token]);
  if (/[가-힣]/.test(token)) {
    for (const [ko, ens] of Object.entries(KO_TO_EN)) {
      if (token === ko || token.includes(ko) || (ko.length >= 2 && ko.includes(token) && token.length >= 2)) {
        for (const en of ens) out.add(en);
      }
    }
  }
  return [...out];
}
