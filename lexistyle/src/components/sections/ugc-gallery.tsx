import Image from "next/image";
import Link from "next/link";
import { Tag } from "lucide-react";
import { ugcPosts } from "@/lib/dummy-data";

export function UgcGallery() {
  return (
    <section aria-label="커뮤니티 갤러리" className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-bold md:text-[24px]">#LEXILOOK</h2>
          <p className="mt-1 text-[13px] text-dim">전 세계 고객의 실착·실사용 순간</p>
        </div>
        <Link href="/community" className="text-[13px] font-semibold text-dim hover:text-ink">
          더 보기 →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        {ugcPosts.map((post) => (
          <Link key={post.id} href="/community" className="group relative block aspect-square overflow-hidden rounded-lg bg-fog">
            <Image src={post.image} alt={`${post.handle}의 게시물`} fill sizes="(max-width:768px) 33vw, 200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/55 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="text-[12px] font-semibold text-white">{post.handle}</p>
              <p className="flex items-center gap-1 text-[11px] text-white/80">
                <Tag className="size-3" /> 상품 {post.tags}개
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
