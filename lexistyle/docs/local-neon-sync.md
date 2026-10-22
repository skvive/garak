# 로컬 저장 ↔ Neon 동기화

## 쿼터 질문

Neon **데이터 전송(egress) 쿼터**는 “언제 올리느냐”가 아니라 **올린 용량**으로 차감된다.

| 방식 | 효과 |
|------|------|
| 개발·크롤을 **로컬에만** | 일상 전송 ≈ 0 → 쿼터 소모 거의 없음 |
| `db:sync:*` 로 모아서 업로드 | **그때** 용량만큼 차감 |
| 크롤마다 Neon 직접 hit | 전송이 계속 쌓여 빨리 막힘 |

로컬에 모았다가 올리면 **개발 중 한도는 피하기 쉽지만**, 올릴 때 용량은 그대로 쓴다.  
통째로 너무 크게 올리면 다시 쿼터에 걸릴 수 있으니 HQ 테이블만 올리는 것이 안전하다.

## 이 PC 현황

Docker Desktop이 없으면 **JSON 로컬 스토어**를 쓴다 (`~/.lexi-local/data/lexi-local.json`).

```bash
npm run db:json:use          # DATABASE_URL 비움 + NEON_DATABASE_URL 유지
npm run dev
```

Docker가 있으면 Postgres 권장:

```bash
npm run db:local:use         # DATABASE_URL=로컬, Neon → NEON_DATABASE_URL
npm run db:local:up && npm run db:push
npm run dev
```

## 커밋·푸시할 때 Neon 올리기

「커밋 푸시」요청 시 에이전트는:

1. dry-run으로 건수 확인
2. sync 실행
3. 그다음 git commit / push

```bash
# JSON 폴백 사용 중 (현재 기본)
npm run db:sync:json-neon:dry
npm run db:sync:json-neon

# Docker Postgres 사용 중
npm run db:sync:neon:dry
npm run db:sync:neon
```

Neon이 아직 쿼터로 막혀 있으면 sync는 실패한다 → 로컬 데이터는 유지, 쿼터 회복 후 재실행.

## env

```env
# JSON 모드
DATABASE_URL=
NEON_DATABASE_URL=postgresql://...@....neon.tech/...

# 또는 Docker 모드
DATABASE_URL=postgresql://lexi:lexi@127.0.0.1:5432/lexi
NEON_DATABASE_URL=postgresql://...@....neon.tech/...
```

시크릿·`.env` 본문은 커밋하지 않는다.
