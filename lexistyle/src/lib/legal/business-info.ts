/**
 * 사업자 정보 단일 정본 — 이용약관·개인정보처리방침·푸터가 함께 읽는다.
 * 전자상거래법상 사이트에 표시해야 하는 정보. 실제 값은 사업자 등록 정보로만 채운다(임의 기입 금지).
 * 비어 있는 항목은 화면에 대괄호 자리표시자 대신 "등록 진행 중"으로 표시된다.
 */
export type BusinessInfo = {
  companyName: string | null;
  ceo: string | null;
  bizRegNo: string | null;
  mailOrderNo: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  privacyOfficer: string | null;
};

// 기본값은 운영자가 제공·게시한 사업자 정보(푸터 + 2026-10-13 운영자 제공분). 환경변수가 있으면 그것이 우선한다.
export const BUSINESS_INFO: BusinessInfo = {
  companyName: process.env.NEXT_PUBLIC_BIZ_NAME ?? "Partners Social Cooperative",
  ceo: process.env.NEXT_PUBLIC_BIZ_CEO ?? "Juncheol Kang",
  bizRegNo: process.env.NEXT_PUBLIC_BIZ_REG_NO ?? "589-82-00469",
  mailOrderNo: process.env.NEXT_PUBLIC_BIZ_MAIL_ORDER_NO ?? "제2026-제주이도2-0104호",
  address: process.env.NEXT_PUBLIC_BIZ_ADDRESS ?? "154 INS, 47 Seochojungang-ro 22-gil, Seocho-gu, Seoul, Republic of Korea",
  email: process.env.NEXT_PUBLIC_BIZ_EMAIL ?? "partnersc88@gmail.com",
  phone: process.env.NEXT_PUBLIC_BIZ_PHONE ?? "0505-248-2468",
  privacyOfficer: process.env.NEXT_PUBLIC_BIZ_PRIVACY_OFFICER ?? "강준철",
};

export const BUSINESS_INFO_ROWS: Array<[label: string, key: keyof BusinessInfo]> = [
  ["상호", "companyName"],
  ["대표자", "ceo"],
  ["사업자등록번호", "bizRegNo"],
  ["통신판매업신고번호", "mailOrderNo"],
  ["주소", "address"],
  ["이메일", "email"],
  ["전화", "phone"],
];
