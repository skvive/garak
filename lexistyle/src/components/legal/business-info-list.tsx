import { BUSINESS_INFO, BUSINESS_INFO_ROWS, type BusinessInfo } from "@/lib/legal/business-info";

/** 사업자 정보 목록 — 값이 없는 항목은 자리표시자 대신 "등록 진행 중" */
export function BusinessInfoList({ extra }: { extra?: Array<[string, keyof BusinessInfo]> }) {
  const rows = [...(extra ?? []), ...BUSINESS_INFO_ROWS];
  return (
    <ul className="ml-4 list-disc space-y-1">
      {rows.map(([label, key]) => (
        <li key={key}>
          {label}: {BUSINESS_INFO[key] ?? <span className="text-dim/70">등록 진행 중</span>}
        </li>
      ))}
    </ul>
  );
}
