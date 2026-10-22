"use client";

export type CatalogCategory = { name: string; count: number };

const KO: Record<string, string> = {
  Uncategorized: "기타",
  Other: "기타",
  /** CJ 한글 → 짧은 라벨 */
  "여성 의류": "여성의류",
  "애완용품": "반려동물",
  "홈, 가든 & 가구": "홈&가든",
  "건강, 미용 및 헤어": "뷰티",
  "보석 및 시계": "주얼리",
  "남성 의류": "남성의류",
  "가방 및 신발": "가방·신발",
  "장난감, 어린이 및 유아용품": "키즈",
  "스포츠 및 아웃도어": "스포츠",
  "소비자 가전제품": "전자제품",
  "주택 개량": "공구·DIY",
  "자동차 및 오토바이": "자동차",
  "휴대폰 및 액세서리": "휴대폰",
  "컴퓨터 및 사무용품": "컴퓨터",
};

function label(name: string) {
  return KO[name] ?? name;
}

export function CategoryToggle({
  categories,
  selected,
  onChange,
  layout = "wrap",
}: {
  categories: CatalogCategory[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** wrap=가로 줄바꿈 · scroll=세로 스크롤 · hscroll=전체폭 가로 스크롤 */
  layout?: "wrap" | "scroll" | "hscroll";
}) {
  const toggle = (name: string) => {
    if (selected.length === 1 && selected[0] === name) {
      onChange([]);
    } else {
      onChange([name]);
    }
  };

  const shell =
    layout === "hscroll"
      ? "flex w-full gap-1.5 overflow-x-auto rounded-xl border border-line bg-fog/30 p-2 [scrollbar-width:thin]"
      : layout === "scroll"
        ? "flex max-h-28 flex-wrap content-start gap-1.5 overflow-y-auto rounded-xl border border-line bg-fog/30 p-2"
        : "flex flex-wrap items-center gap-1.5";

  return (
    <div className={shell} role="group" aria-label="카테고리">
      <button
        type="button"
        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold leading-relaxed ${
          selected.length === 0 ? "bg-ink text-white" : "bg-paper text-dim hover:bg-ink/10"
        }`}
        onClick={() => onChange([])}
      >
        전체
      </button>
      {categories.map((c, i) => {
        const on = selected.includes(c.name);
        return (
          <button
            key={`${c.name}-${i}`}
            type="button"
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold leading-relaxed ${
              on ? "bg-ink text-white" : "bg-paper text-dim hover:bg-ink/10"
            }`}
            onClick={() => toggle(c.name)}
          >
            {label(c.name)}
            <span className="ml-1 tabular-nums opacity-70">{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}
