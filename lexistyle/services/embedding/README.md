# LEXI 임베딩 사이드카 (M8)

kekemind 이식. 한국어 static 임베딩으로 `/api/embed`, `/api/analyze`를 제공하는 상태 없는 서비스.
lexistyle는 `EMBED_SERVICE_URL` 로 호출하고, **미설정 시 앱 내 결정적 폴백**으로 동작한다
(`src/lib/marketing/embed.ts`). 즉 이 서비스 없이도 분류·검색·클러스터가 돌아가며,
붙이면 시맨틱 품질(동의어·의미 유사)이 올라간다.

## 실행
```bash
cd services/embedding
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8100
```

## lexistyle 연결
Vercel(lexi0) 서버 환경변수:
```
EMBED_SERVICE_URL=https://<사이드카-호스트>
```
(선택) `EMBED_API_TOKEN` 로 Bearer 보호, `KEKE_MODEL` 로 모델 교체.

## 엔드포인트
| Method | Path | 용도 |
|---|---|---|
| GET | `/health` | 모델·차원·카테고리 |
| POST | `/api/embed` `{texts[]}` | 텍스트 → 512d 임베딩(정규화) |
| POST | `/api/analyze` `{text}` | 임베딩 + 최근접 centroid 카테고리 + 빈도 태그 |

## ⚠️ 라이선스
- 이 코드/리포: Apache 2.0 (kekemind 유래).
- 모델 `kekeappa/kor-static-embedding-512`: **HuggingFace 모델카드 및 증류 베이스
  라이선스를 프로덕션 배포 전 반드시 확인**. 필요 시 `KEKE_MODEL` 로 라이선스가 명확한
  한국어 임베딩 모델로 교체.

## 프로덕션 확장 경로
- 단기: 이 FastAPI 사이드카(별도 호스트/컨테이너).
- 중기: ONNX/transformers.js 로 in-Node 이관 → 별도 서비스 제거.
- 저장: 현재는 HQ 스냅샷 스토어 배열 + TS cosine. 규모 확대 시 Neon `pgvector(512)` + HNSW 이관.
