# LEXI — Curated K-Style, Delivered Worldwide

K-뷰티·패션·라이프스타일 **역직구 커머스 플랫폼**. YesStyle을 역설계해 에디토리얼 커머스로 재설계했다.
전체 설계 명세: [`docs/lexi-master-spec.md`](docs/lexi-master-spec.md)

## Stack
Next.js 15 (App Router) · Tailwind CSS v4 · Neon PostgreSQL (Drizzle) · Vercel

## Quick Start
```bash
npm install
npm run dev            # http://localhost:3000 — DB 없이 더미 데이터로 동작
```

## Neon DB 연결 (선택)
```bash
cp .env.example .env   # DATABASE_URL 입력
npm run db:push        # 스키마 반영
npm run seed:dummy     # 더미 데이터 시딩 (real 모드에서는 가드로 차단)
```

## Dummy / Real 전환
`/admin` 우상단 토글 → 영향 요약 확인 → `LEXI` 타이핑 → Soft Delete 실행.
상태는 `site_settings.data_mode`에 영속화되고 `data_mode_audit`에 기록된다.

## Deploy
```bash
npm run deploy         # vercel --prod + lexi.vercel.app → lexi0,1,2… 별칭 폴백
```
