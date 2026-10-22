"use client";

import { validateChannelExport } from "@/lib/export/channel-projection";
import type { PdpStructured } from "@/lib/pdp/ruleset";

type CatalogLite = { id: number; categoryPath?: string[] | null };

export function ExportChannelChecklist({
  channels,
  structured,
  catalog,
  assetCount,
}: {
  channels: string[];
  structured: PdpStructured | null;
  catalog: CatalogLite | null;
  assetCount: number;
}) {
  if (!structured || !channels.length) {
    return (
      <p className="text-[12px] leading-relaxed text-dim">PDP 문서를 선택하면 채널별 필수 필드 체크리스트가 표시됩니다.</p>
    );
  }

  const catalogRow = catalog
    ? {
        id: catalog.id,
        supplierCode: "",
        externalId: "",
        title: structured.title,
        categoryPath: catalog.categoryPath ?? null,
        minPrice: null,
        maxPrice: null,
        currency: "USD",
        stock: 0,
        primaryThumbUrl: null,
        sellerName: null,
        sourceUrl: null,
        searchableText: null,
        contentHash: null,
        sourceStatus: "",
        importState: "imported",
        productId: null,
        documentId: null,
        indexedAt: new Date(),
        updatedAt: new Date(),
      }
    : null;

  return (
    <div className="grid gap-3">
      {channels.map((ch) => {
        const gate = validateChannelExport(ch, structured, catalogRow, assetCount);
        return (
          <div key={ch} className="rounded-xl border border-line bg-paper p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold">{ch}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gate.ok ? "bg-emerald-100 text-emerald-800" : "bg-coral/15 text-coral"}`}
              >
                {gate.ok ? "ready" : "blocked"}
              </span>
              {gate.mockMode && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">mock</span>
              )}
            </div>
            <ul className="mt-2 grid gap-1 text-[11px] leading-relaxed text-dim">
              {gate.checklist.map((item) => (
                <li key={item.field} className={item.ok ? "text-ink/70" : "font-semibold text-coral"}>
                  {item.ok ? "✓" : "✗"} {item.field}
                  {item.note ? ` — ${item.note}` : ""}
                </li>
              ))}
            </ul>
            {!gate.ok && gate.errors.length > 0 && (
              <p className="mt-2 text-[11px] leading-relaxed text-coral">{gate.errors.join(" · ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
