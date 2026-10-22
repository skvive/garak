# HQ 공급처 프로바이더

`/hq/suppliers`는 플랫폼 커넥터 JSON이 아니라, **각 플랫폼이 상품페이지에 넘기는 실제 셀러/공장**을 보여 준다.

## 플랫폼
| 토글 | 기본 | 연동 | 프로바이더 소스 |
|------|------|------|-----------------|
| CJ 드랍쉬핑 | 기본 | 연결됨 | `catalog_index`를 `supplierId`·셀러명으로 집계 |
| 슈퍼바이 | — | 미연동 | 빈 상태 (1688/타오바오 대행 게이트웨이 준비 중) |

## 행 필드
회사명 · 전화번호 · 이메일 · 홈페이지(있으면) · 상품 수.

CJ 공식 API는 공장 전화/이메일을 주지 않는다. 없으면 `—`. 이름은 `supplierName`/`supplierId`.

## API
- `GET /api/hq/suppliers/providers?platform=cjdropshipping|superbuy`
- `POST /api/hq/suppliers/providers` `{ platform }` — 커넥터 목록으로 셀러 메타 갱신

보기: 목록 기본, 그리드 전환.
