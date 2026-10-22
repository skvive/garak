import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAmbaCasts, pickAmbaCast } from "@/lib/pdp/amba-casts";

type Props = {
  params: Promise<{ lng: string; id: string }>;
};

export async function generateStaticParams() {
  return listAmbaCasts().map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const m = pickAmbaCast({ id });
  if (!m) return { title: "AMBA Model" };
  return {
    title: `${m.name} · AMBA`,
    description: `${m.gender} · ${m.nationality} · ${m.interests.join(", ")}`,
  };
}

export default async function AmbaModelDetailPage({ params }: Props) {
  const { lng, id } = await params;
  const m = pickAmbaCast({ id });
  if (!m) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href={`/${lng}/amba`} className="text-[13px] text-dim hover:text-ink">
        ← AMBA 모델 목록
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] border border-line bg-cream">
          <Image src={m.publicPath} alt={m.name} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" priority />
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-coral uppercase">
            AMBA · AI Ambassador
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{m.name}</h1>
          <p className="mt-2 text-[15px] text-dim">
            {m.gender} · {m.nationality} · {m.source.eth}/{m.source.nat}
          </p>

          <dl className="mt-8 space-y-3 border-t border-line pt-6 text-[14px]">
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-dim">소속사</dt>
              <dd className="font-medium">AMBA (AI Ambassador)</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-dim">관심사</dt>
              <dd>{m.interests.join(" · ")}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-dim">룩북 ID</dt>
              <dd className="font-mono text-[13px]">{m.id}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-dim">스타일</dt>
              <dd>{m.source.style}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
