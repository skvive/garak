import Image from "next/image";
import Link from "next/link";
import { listSections } from "@/lib/studio/store";
import type { SectionPayload } from "@/lib/studio/types";

export async function StudioStorefrontSections() {
  let sections: Awaited<ReturnType<typeof listSections>> = [];
  try {
    sections = await listSections({ publishedOnly: true });
  } catch {
    return null;
  }
  if (!sections.length) return null;
  return <StudioSectionsView sections={sections} />;
}

export function StudioSectionsView({
  sections,
}: {
  sections: Awaited<ReturnType<typeof listSections>>;
}) {
  return (
    <>
      {sections.map((section) => (
        <StudioSection
          key={section.id}
          slot={section.slot}
          title={section.title}
          payload={section.payload as SectionPayload}
        />
      ))}
    </>
  );
}

function StudioSection({
  slot,
  title,
  payload,
}: {
  slot: string;
  title: string;
  payload: SectionPayload;
}) {
  if (slot === "hero") {
    return (
      <section className="relative min-h-[70svh] overflow-hidden bg-ink">
        {payload.image && (
          <Image
            src={payload.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
        <div className="relative mx-auto flex min-h-[70svh] max-w-6xl items-end px-5 pb-14 text-white">
          <div>
            {payload.eyebrow && (
              <p className="text-[11px] font-bold tracking-[.2em] text-white/75">{payload.eyebrow}</p>
            )}
            <h1 className="mt-2 max-w-2xl font-display text-[38px] font-semibold leading-tight md:text-[60px]">
              {payload.headline || title}
            </h1>
            {payload.description && (
              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-white/80">
                {payload.description}
              </p>
            )}
            <Link
              href={payload.href || "/best"}
              className="mt-6 inline-block rounded-full border border-white/60 px-6 py-3 text-[13px] font-bold"
            >
              {payload.cta || "Explore"} →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-5 rounded-3xl bg-fog p-6 md:grid-cols-[1fr_1.2fr] md:p-9">
        <div className="self-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-coral">{slot}</p>
          <h2 className="mt-2 font-display text-[28px] font-semibold">{payload.headline || title}</h2>
          {payload.description && (
            <p className="mt-3 text-[14px] leading-relaxed text-dim">{payload.description}</p>
          )}
          <Link href={payload.href || "/best"} className="mt-5 inline-block text-[13px] font-bold">
            {payload.cta || "자세히 보기"} →
          </Link>
        </div>
        {payload.image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-line">
            <Image src={payload.image} alt="" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
