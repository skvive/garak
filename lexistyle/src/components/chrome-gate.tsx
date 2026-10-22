"use client";

import { usePathname } from "next/navigation";

const ADMIN_SEGMENTS = new Set(["hq", "studio", "admin"]);

/** 스토어프론트 헤더·푸터·탭바를 어드민 화면(/hq, /studio, /admin)에서는 숨긴다 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const seg = (usePathname() ?? "").split("/")[2];
  return ADMIN_SEGMENTS.has(seg) ? null : <>{children}</>;
}
