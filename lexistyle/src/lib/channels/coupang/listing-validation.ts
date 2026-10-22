/** Coupang counts search tags individually; overlong generated phrases must not be submitted. */
export function coupangSearchTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag && Array.from(tag).length <= 20))].slice(0, 20);
}

/** A share/view page is not a downloadable certificate. Fail before creating a listing. */
export async function validateCoupangDocument(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || url.length > 150) {
    throw new Error("쿠팡 구비서류는 150자 이하의 HTTPS 직접 다운로드 URL이 필요합니다.");
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  try {
    const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const allowed = new Set([
      "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/x-hwp", "application/haansofthwp", "text/plain", "image/png", "image/jpeg",
    ]);
    if (!response.ok || !type || !allowed.has(type)) {
      throw new Error("쿠팡 구비서류 다운로드 실패: 공유 페이지 대신 공개 PDF·문서·이미지 직접 다운로드 URL을 설정하세요.");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("쿠팡 구비서류가 비어 있습니다.");
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 5 * 1024 * 1024) throw new Error("쿠팡 구비서류는 5MB 이하여야 합니다.");
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    if (!size) throw new Error("쿠팡 구비서류가 비어 있습니다.");
  } finally {
    if (response.body && !response.body.locked) await response.body.cancel();
  }
}
