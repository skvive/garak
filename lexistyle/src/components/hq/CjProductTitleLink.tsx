"use client";

import { cjProductPageUrl, openCjProductPopup, type CjProductLinkInput } from "@/lib/catalog/cj-product-link";

/** 파이프라인 그리드·목록 등 — 제목 클릭 시 CJ 원본 상품 페이지 팝업 */
export function CjProductTitleLink({
  product,
  title,
  className = "",
  stopPropagation = false,
}: {
  product: CjProductLinkInput;
  title: string;
  className?: string;
  stopPropagation?: boolean;
}) {
  const url = cjProductPageUrl(product);
  if (!url) {
    return <span className={className}>{title}</span>;
  }

  return (
    <button
      type="button"
      className={`cursor-pointer text-left underline-offset-2 hover:text-coral hover:underline ${className}`}
      title="CJ 원본 상품 페이지 열기"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        openCjProductPopup(product);
      }}
    >
      {title}
    </button>
  );
}
