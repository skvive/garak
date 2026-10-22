/** 최소 pLimit 구현 — 의존성 없이 동시 실행 수 제한 */
export function pLimit<T>(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;

  async function next() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const fn = queue.shift()!;
    await fn();
    active--;
    void next();
  }

  return function limit(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      void next();
    });
  };
}