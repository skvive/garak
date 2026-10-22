"use client";

export type ViewMode = "list" | "grid";

export function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-line" role="group" aria-label="보기 전환">
      <button
        type="button"
        aria-pressed={viewMode === "list"}
        className={`px-3 py-2 text-[12px] font-bold transition-colors ${
          viewMode === "list" ? "bg-ink text-white" : "bg-paper text-dim hover:bg-fog"
        }`}
        onClick={() => onChange("list")}
        title="목록 보기"
      >
        ☰ 리스트
      </button>
      <button
        type="button"
        aria-pressed={viewMode === "grid"}
        className={`px-3 py-2 text-[12px] font-bold transition-colors ${
          viewMode === "grid" ? "bg-ink text-white" : "bg-paper text-dim hover:bg-fog"
        }`}
        onClick={() => onChange("grid")}
        title="그리드 보기"
      >
        ⊞ 그리드
      </button>
    </div>
  );
}
