# 로컬 개발 (Neon/Vercel 없이)

## 권장 흐름

Docker·Neon 없이 **로컬 파일 DB**로 저장하고 브라우저로 확인합니다.

```bash
npm install
# .env.local 에 DATABASE_URL=  (비움)
npm run dev
```

브라우저: http://localhost:3000/hq/pipeline/catalog  
→ **갱신** 클릭 후 목록 확인. CJ 목록을 끝까지 받은 뒤 인덱스에 upsert하고, 이번 스윕에 없는 SKU는 삭제(임포트된 것은 숨김).

| 저장 | 경로 |
|------|------|
| 카탈로그/PDP/export | `%USERPROFILE%\.lexi-local\data\lexi-local.json` |
| 최적화 이미지 | `%USERPROFILE%\.lexi-local\data\assets` → `/api/local-media/...` |

서버 재시작 후에도 데이터가 유지됩니다.

### Dropbox 폴더에서 `.next` UNKNOWN 오류가 나면

Dropbox 동기화가 `.next`를 잠글 수 있습니다. 그때는 Dropbox **밖**에서 실행하세요.

```powershell
$src = "C:\Users\FORYOUCOM\Dropbox\cursor_c\lexistyle"
$dst = "C:\Users\FORYOUCOM\lexistyle-work"
robocopy $src $dst /MIR /XD .next node_modules .git .vercel
Copy-Item "$src\.env.local" "$dst\.env.local" -Force
cd $dst; npm install; npm run dev
```

코드 수정은 Dropbox 쪽 원본에서 하고, 실행만 `lexistyle-work`에서 하면 됩니다.

## Neon 쿼터 회피 (로컬 저장 → 커밋 시 업로드)

상세: [`docs/local-neon-sync.md`](./local-neon-sync.md)

- **지금(Docker 없음):** `npm run db:json:use` → `~/.lexi-local` JSON에 저장 → 커밋·푸시 때 `npm run db:sync:json-neon`
- **Docker 있음:** `npm run db:local:use` → 로컬 Postgres → `npm run db:sync:neon`

## 선택: Docker Postgres

Docker Desktop이 켜져 있을 때:

```bash
npm run db:local:use
npm run db:local:up
npm run db:push
npm run dev
```
