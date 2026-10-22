"use client";

import Link from "next/link";
import { CJ_INVENTORY_URL, CJ_SOURCING_LIST_URL } from "@/lib/hq/cj-links";

export function CjCatalogLinks() {
  return (
    <div className="flex flex-wrap gap-2 text-[13px] leading-[1.6]">
      <a className="rounded-lg border border-line px-2.5 py-1.5 font-bold" href={CJ_INVENTORY_URL} target="_blank" rel="noreferrer">
        CJ 내 인벤토리
      </a>
      <a className="rounded-lg border border-line px-2.5 py-1.5 font-bold" href={CJ_SOURCING_LIST_URL} target="_blank" rel="noreferrer">
        CJ 소싱 리스트
      </a>
      <Link className="rounded-lg border border-line px-2.5 py-1.5 font-bold" href="/hq/cj-inventory">
        HQ 내 재고
      </Link>
      <Link className="rounded-lg border border-line px-2.5 py-1.5 font-bold" href="/hq/cj-sourcing">
        HQ 소싱요청
      </Link>
    </div>
  );
}
