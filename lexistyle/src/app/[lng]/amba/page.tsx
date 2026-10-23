import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listAmbaCasts } from "@/lib/pdp/amba-casts";

export const metadata: Metadata = {
  title: "AMBA Models",
  description: "AMBA (AI Ambassador) — 가락한상 lookbook cast profiles",
};

const STYLE_LABEL: Record<string, string> = {
  STU: "Studio",
  HIG: "Editorial",
  STR: "Street",
  SPO: "Active",
  BTY: "Beauty",
  FML: "Formal",
  OUT: "Outdoor",
};

export default async function AmbaModelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string }>;
  searchParams: Promise<{ sex?: string; nat?: string; style?: string; q?: string }>;
}) {
  const { lng } = await params;
  const sp = await searchParams;
  const all = listAmbaCasts();

  let models = all;
  if (sp.sex) models = models.filter((m) => m.source.sex === sp.sex);
  if (sp.nat) models = models.filter((m) => m.source.nat === sp.nat);
  if (sp.style) models = models.filter((m) => m.source.style === sp.style);
  if (sp.q) {
    const q = sp.q.toLowerCase();
    models = models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.nationality.includes(sp.q!) ||
        m.id.includes(q) ||
        m.folder.toLowerCase().includes(q),
    );
  }

  const nationals = [...new Set(all.map((m) => m.source.nat))].sort();
  const styles = [...new Set(all.map((m) => m.source.style))].sort();

  const chip = (active: boolean) =>
    active
      ? "border-ink bg-ink text-paper"
      : "border-line bg-paper text-ink hover:border-ink";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-coral uppercase">
          AMBA · AI Ambassador
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          가락한상 화보 모델
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-dim">
          AMBA(Ai-Ambassdor Agency) 소속된 AI 모델들입니다. 본 모델들의 프로필 및 가상 데이터는
          &apos;디지털 편집저작물&apos;로서 저작권법의 보호를 받으므로, 무단 도용 및 승인 없는 배포를
          금지합니다.
        </p>
      </header>

      <form className="mb-6 flex flex-wrap items-center gap-2" method="get">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="이름·국적·ID 검색"
          className="min-w-[180px] flex-1 rounded-full border border-line bg-fog px-4 py-2 text-[13px] outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="rounded-full border border-ink bg-ink px-4 py-2 text-[13px] font-medium text-paper"
        >
          검색
        </button>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link href={`/${lng}/amba`} className={`rounded-full border px-3 py-1.5 text-[12px] ${chip(!sp.sex)}`}>
          전체 성별
        </Link>
        <Link
          href={`/${lng}/amba?sex=F${sp.nat ? `&nat=${sp.nat}` : ""}${sp.style ? `&style=${sp.style}` : ""}`}
          className={`rounded-full border px-3 py-1.5 text-[12px] ${chip(sp.sex === "F")}`}
        >
          여성
        </Link>
        <Link
          href={`/${lng}/amba?sex=M${sp.nat ? `&nat=${sp.nat}` : ""}${sp.style ? `&style=${sp.style}` : ""}`}
          className={`rounded-full border px-3 py-1.5 text-[12px] ${chip(sp.sex === "M")}`}
        >
          남성
        </Link>
        {nationals.map((n) => (
          <Link
            key={n}
            href={`/${lng}/amba?nat=${n}${sp.sex ? `&sex=${sp.sex}` : ""}${sp.style ? `&style=${sp.style}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-[12px] ${chip(sp.nat === n)}`}
          >
            {n}
          </Link>
        ))}
        {styles.map((s) => (
          <Link
            key={s}
            href={`/${lng}/amba?style=${s}${sp.sex ? `&sex=${sp.sex}` : ""}${sp.nat ? `&nat=${sp.nat}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-[12px] ${chip(sp.style === s)}`}
          >
            {STYLE_LABEL[s] || s}
          </Link>
        ))}
      </div>

      <p className="mb-4 text-[13px] text-dim">{models.length}명 표시</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {models.map((m) => (
          <Link
            key={m.id}
            href={`/${lng}/amba/${m.id}`}
            className="group overflow-hidden rounded-[14px] border border-line bg-paper transition hover:-translate-y-0.5 hover:border-ink"
          >
            <div className="relative aspect-[3/4] bg-cream">
              <Image
                src={m.publicPath}
                alt={m.name}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                sizes="(max-width:768px) 50vw, 25vw"
              />
            </div>
            <div className="space-y-1.5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-wide text-coral">AMBA</span>
                <span className="text-[10px] text-dim">{m.id}</span>
              </div>
              <h2 className="truncate text-[14px] font-semibold text-ink">{m.name}</h2>
              <p className="text-[12px] text-dim">
                {m.gender} · {m.nationality}
              </p>
              <p className="line-clamp-2 text-[11px] leading-snug text-dim">
                {m.interests.join(" · ")}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {models.length === 0 && (
        <p className="rounded-[14px] border border-dashed border-line px-6 py-16 text-center text-dim">
          조건에 맞는 모델이 없습니다.
        </p>
      )}
    </main>
  );
}
