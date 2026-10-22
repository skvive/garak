// /lib/pdp/amba-models.ts — AMBA Registry JSON 기반 타입 & 유틸리티

import registryData from "../../../amba/registry.json";

/**
 * AMBA ModelRegistry (ambatRegistry.json)
 * Source: https://github.com/shinkangteam/ambassador-ai-site
 * Local: E:/cursor_HS/kcci/SITE/ambassador-ai-site
 */

export interface AMBAResource {
  sourceRepo: string;
  localClone: string;
  agency: "AMBA";
  agencyFull: "AI Ambassador";
  generatedAt: string;
  count: number;
  models: AMBAModel[];
}

export interface AMBAModel {
  id: string; // ex: amba-0386
  lookbookId: string; // ex: 0386
  packageId: string; // ex: LEXI-STYLE-2026-01
  filename: string; // 파일명
  path: string; // 로컬 경로
  publicPath: string; // 공개 URL (ex: /amba/LEXI-STYLE-2026-01/...)
  ethnicity: string; // 예: MX, WE, SE, ME 등
  ethnicityLabel: string;
  nationality: string; // ISO 코드 (ex: US, CA, VN)
  nationalityLabel: string; // 국적이름 (ex: 미국, 캐나다, 베트남)
  sex: "M" | "F";
  gender: "남성" | "여성";
  age_band: string; // ex: A1, M0
  style: "STU" | "HIG" | "STR" | "SPO" | "BTY" | "FML" | "OUT";
  agency: "AMBA";
  agencyFull: "AI Ambassador";
  faceSeed: string; // 얼굴 시드 이미지 경로
  name: string; // 한국어·영어 조합 (ex: "예린 · Ivy Brooks")
  nameKo: string; // 한국어 이름
  nameEn: string; // 영어 이름
  interests: string[]; // 관심사 (ex: ["테일러드 수트", "카페 산책", "필름 카메라"])
  modelCast: ModelCastInfo;
}

export interface ModelCastInfo {
  name: string;
  gender: "남성" | "여성";
  nationality: string;
  interests: string[];
  agency: "AMBA";
  agencyFull: "AI Ambassador";
  faceSeed: string;
}

/**
 * 스타일별 레이블 매핑
 */
export const STYLE_LABEL: Record<string, string> = {
  STU: "Studio",
  HIG: "Editorial",
  STR: "Street",
  SPO: "Active",
  BTY: "Beauty",
  FML: "Formal",
  OUT: "Outdoor",
};

/**
 * AMBA Registry JSON 파일 경로
 * 위치: amba/registry.json (프로젝트 루트 기준)
 *
 * 실제 이미지 위치:
 * - registry.json: amba/models/kcci-submission/LEXI-STYLE-{nn}/images/...
 * - public: /amba/LEXI-STYLE-{nn}/...
 *
 * registry.json 의 faceSeed 와 publicPath 는 이미 /amba/... 형태로 되어 있음
 *
 * Vercel serverless는 런타임 fs 접근이 불가하므로, 빌드 시 번들되는
 * `amba/registry.json`(git 추적됨)을 정적 import로 사용한다.
 */

/**
 * AMBA Registry 데이터를 동기적으로 로드
 */
let _registryData: AMBAResource | null = null;

export function loadAmbaRegistry(): AMBAResource {
  if (_registryData) return _registryData;
  _registryData = registryData as AMBAResource;
  return _registryData;
}

/**
 * AMBA 모델 전체 목록을 반환 (캐싱됨)
 */
let _cachedModels: AMBAModel[] | null = null;

export function listAmbaModels(): AMBAModel[] {
  if (_cachedModels) return _cachedModels;
  
  const registry = loadAmbaRegistry();
  _cachedModels = registry.models;
  return _cachedModels;
}

/**
 * ID 로 단일 모델 찾기
 */
export function findAmbaModelById(id: string): AMBAModel | undefined {
  return listAmbaModels().find((m) => m.id === id);
}

/**
 * 성별 (F/M) 으로 필터링
 */
export function filterBySex(models: AMBAModel[], sex: "F" | "M"): AMBAModel[] {
  return models.filter((m) => m.sex === sex);
}

/**
 * 성별 명칭 ("남성"/"여성") 으로 필터링
 */
export function filterByGender(models: AMBAModel[], gender: "남성" | "여성"): AMBAModel[] {
  return models.filter((m) => m.gender === gender);
}

/**
 * 국적 (ISO 코드) 으로 필터링
 */
export function filterByNationality(models: AMBAModel[], nationality: string): AMBAModel[] {
  return models.filter((m) => m.nationality === nationality);
}

/**
 * 국적이름으로 필터링
 */
export function filterByNationalityLabel(models: AMBAModel[], label: string): AMBAModel[] {
  return models.filter((m) => m.nationalityLabel === label);
}

/**
 * 스타일로 필터링
 */
export function filterByStyle(models: AMBAModel[], style: string): AMBAModel[] {
  return models.filter((m) => m.style === style);
}

/**
 * 이름 또는 국적명으로 검색
 */
export function searchModels(
  models: AMBAModel[],
  query: string
): AMBAModel[] {
  const q = query.toLowerCase();
  return models.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.nameKo.toLowerCase().includes(q) ||
      m.nameEn.toLowerCase().includes(q) ||
      m.nationality.includes(q) ||
      m.nationalityLabel.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.lookbookId.includes(q)
  );
}

/**
 * 모든 고유 성별 목록
 */
export function getAllGenders(models: AMBAModel[]): string[] {
  return [...new Set(models.map((m) => m.gender))].sort();
}

/**
 * 모든 고유 국적 (ISO) 목록
 */
export function getAllNationalities(models: AMBAModel[]): string[] {
  return [...new Set(models.map((m) => m.nationality))].sort();
}

/**
 * 모든 고유 국적이름 목록
 */
export function getAllNationalityLabels(models: AMBAModel[]): string[] {
  return [...new Set(models.map((m) => m.nationalityLabel))].sort();
}

/**
 * 모든 고유 스타일 목록
 */
export function getAllStyles(models: AMBAModel[]): string[] {
  return [...new Set(models.map((m) => m.style))].sort();
}

/**
 * 모델 수 집계
 */
export function getModelStats(models: AMBAModel[]) {
  const genderCount: Record<string, number> = {};
  const natCount: Record<string, number> = {};
  const styleCount: Record<string, number> = {};

  models.forEach((m) => {
    genderCount[m.gender] = (genderCount[m.gender] || 0) + 1;
    natCount[m.nationalityLabel] = (natCount[m.nationalityLabel] || 0) + 1;
    styleCount[m.style] = (styleCount[m.style] || 0) + 1;
  });

  return {
    totalCount: models.length,
    byGender: genderCount,
    nationalities: Object.keys(natCount).length,
    byStyle: styleCount,
  };
}