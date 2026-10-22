/** 영문 상품명 → 한글 표기 (규칙 기반, 검색·대시보드용) */
const WORD_MAP: Record<string, string> = {
  Women: "여성",
  Men: "남성",
  Unisex: "유니섹스",
  Dress: "원피스",
  Shirt: "셔츠",
  Blouse: "블라우스",
  Pants: "팬츠",
  Jeans: "진",
  Skirt: "스커트",
  Jacket: "자켓",
  Coat: "코트",
  Hoodie: "후디",
  Sweater: "스웨터",
  Knit: "니트",
  Bag: "가방",
  Shoes: "신발",
  Sneakers: "스니커즈",
  Socks: "양말",
  Hat: "모자",
  Cap: "캡",
  Jewelry: "주얼리",
  Necklace: "목걸이",
  Earrings: "귀걸이",
  Bracelet: "팔찌",
  Ring: "반지",
  Beauty: "뷰티",
  Makeup: "메이크업",
  Cream: "크림",
  Serum: "세럼",
  Mask: "마스크",
  Nail: "네일",
  Toy: "장난감",
  Kids: "키즈",
  Baby: "베이비",
  Pet: "펫",
  Outdoor: "아웃도어",
  Sports: "스포츠",
  Cycling: "사이클",
  Leg: "레그",
  New: "신상",
  Fashion: "패션",
  Casual: "캐주얼",
  Vintage: "빈티지",
  Summer: "여름",
  Winter: "겨울",
  Spring: "봄",
  Autumn: "가을",
  Soft: "소프트",
  Warm: "따뜻한",
  Large: "라지",
  Small: "스몰",
  Mini: "미니",
  Multifunctional: "다기능",
};

export function translateProductTitleKo(title: string): string {
  const t = title.trim();
  if (!t) return "";
  if (/[\uac00-\ud7a3]/.test(t)) return t;
  let out = t;
  const entries = Object.entries(WORD_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [en, ko] of entries) {
    out = out.replace(new RegExp(`\\b${en}\\b`, "gi"), ko);
  }
  return out === t ? t : out;
}

export function displayTitles(title: string, titleKo?: string | null) {
  const ko = (titleKo?.trim() || translateProductTitleKo(title)).trim();
  return { titleEn: title, titleKo: ko };
}
