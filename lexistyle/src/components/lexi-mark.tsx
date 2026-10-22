/**
 * LEXI 하트-인피니티 매듭 마크 (브랜드 로고 SVG 재현).
 * 두 리본 루프(좌/우 미러)가 교차해 하트를 이루는 형태.
 * 색은 currentColor를 따르므로 놓이는 자리의 텍스트 컬러(그레이=text-dim 등)를 그대로 쓴다.
 * gap: 리본 교차부(over/under) 언더레이 색 — 놓이는 배경색과 맞춰 halo를 없앤다
 *      (흰 배경=#ffffff 기본, 푸터 fog=#f5f5f3).
 */
const LOBE = "M50 84 C 28 72 17 50 26 32 C 32 20 49 21 51 36 C 52 47 44 53 46 65 C 47 73 48 79 50 84 Z";

export function LexiMark({
  size = 28,
  className,
  gap = "#ffffff",
  title = "가락한상",
}: {
  size?: number;
  className?: string;
  gap?: string;
  title?: string;
}) {
  const sw = 6.5;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {/* 왼쪽 리본 */}
      <path d={LOBE} stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      {/* 오른쪽 리본: 교차부 갭 언더레이 → 스트로크 (over/under 위빙) */}
      <path d={LOBE} transform="translate(100,0) scale(-1,1)" stroke={gap} strokeWidth={sw + 3.5} strokeLinejoin="round" />
      <path d={LOBE} transform="translate(100,0) scale(-1,1)" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** 마크 + 워드마크 가로 조합 */
export function LexiLogo({
  size = 22,
  gap,
  className,
}: {
  size?: number;
  gap?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LexiMark size={size} gap={gap} />
      <span className="font-display font-semibold tracking-tight">
        LEXI<span className="text-coral">.</span>
      </span>
    </span>
  );
}
