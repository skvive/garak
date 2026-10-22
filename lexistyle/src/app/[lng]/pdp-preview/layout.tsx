/** 루트 레이아웃 — 인증/미들웨어 범위 밖 자유 접근 */
export const dynamic = "force-dynamic";

export default function PdpPreviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}