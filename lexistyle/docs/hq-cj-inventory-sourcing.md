# HQ ← CJ 인벤토리·소싱 메뉴 패리티

기준 화면: [Product Inventory](https://cjdropshipping.com/mine/myInventoryNew/productInventory), [Sourcing 안내](https://cjdropshipping.com/sourcing), [Shopping API](https://developers.cjdropshipping.cn/en/api/api2/api/shopping.html), [Product API](https://developers.cjdropshipping.com/en/api/api2/api/product.html).

검증: Playwright로 인벤토리 URL을 열면 **로그인 페이지로 리다이렉트**된다. 로그인된 크롬 화면(사용자 캡처) + 공식 문서만 근거로 한다. CJ 세션을 HQ에 심지 않는다.

원칙: **CJ 상품/공장/브랜드 메뉴를 HQ 사이드바에 복제하지 않는다.** 카탈로그·공급처는 이미 그 역할이다. 연동은 **우리 재고·미발견 상품 티켓**처럼 CJ만 가진 원장만 맞춘다.

## 크롬에서 본 CJ 구조

상품 아이콘 아래:

| CJ | 의미 | HQ에 이미 있는 것 |
|----|------|-------------------|
| Products | CJ 공개 카탈로그 | `/hq/pipeline/catalog` |
| Factories | CJ가 중개하는 공장/셀러 | `/hq/suppliers` 프로바이더 |
| Brands | CJ 입점 브랜드 디렉터리 | 스토어 `/brands`와 **다름** (LEXI 판매 브랜드) |
| Sourcing → Sourcing List / By CJ / 1688 / TaoBao / AliExpress / eBay / QK | **카탈로그에 없는 상품을 CJ에 찾아 달라**는 요청 | 없음 |
| Product Inventory | **내가 산 프라이빗/예치 재고** | 없음. 카탈로그 `stock`은 공개 드랍십 재고 |
| Private Inventory of Bundle Products | 묶음 전용 프라이빗 | 없음 |
| Deposit Inventory | 예치(디파짓) 재고 | 없음 |
| Alert Status / Total Value / CN 창고 | 재고 경보·평가액·창고 | 카탈로그 갱신에 단일 `stock`만 |

주문 쪽 `orderKind=inventory` 탭은 **인벤토리 발주**용이지, 이 재고 원장이 아니다.

## 세 층을 섞지 말 것

```
A. CJ 공개 카탈로그     → HQ 카탈로그 인덱스 (이미 동기화)
B. 내 인벤토리(선매입)  → 아직 없음. 선매입할 때만 필요
C. 소싱 요청 티켓       → 아직 없음. OpenAPI 목록이 공개되어 있지 않음
```

1688을 두 길로 합치지 않는다.

| 길 | 무엇 | HQ |
|----|------|-----|
| CJ Sourcing By 1688 | URL을 CJ에 넘기면 CJ가 소싱해 **CJ 상품이 됨** | C. 티켓. 확장 프로그램은 CJ 크롬 |
| Superbuy | 우리가 1688을 대리구매 | `connectors/superbuy.ts` 미연동. CJ 인벤토리와 무관 |

## 추가로 연동할 것

### 하지 말 것 (복제 금지)

- Products/Factories/Brands를 HQ 좌측에 1:1 메뉴로 넣기.
- CJ 인벤토리 테이블을 카탈로그 인덱스에 덮어쓰기.
- 소싱 요청을 Superbuy 발주로 취급.

### P0 — 카탈로그 SKU 창고 재고 (드랍십)

공개 재고가 0이면 발주가 막힌다. **리스트 `listedNum`은 재고가 아니다** — 크롤은 재고를 미확인으로 두고, Import / `stock-refresh`(`enable_inventory`)만 `stockVerified`를 켠다.

- `GET /product/stock/queryByVid?vid=`
- `product/query` `features=enable_inventory` + `countryCode`
- `GET /product/globalWarehouseList`

HQ: 카탈로그 행에 창고별 수량, 경보(Alert: 미확인|품절|부족|정상). 화면은 카탈로그에 배지. 새 톱 메뉴 없음.

### P1 — 내 인벤토리 (선매입할 때)

[프라이빗 재고 구매](https://cjdropshipping.com/article-details/How-to-Purchase-Private-Inventory)를 쓰기 시작하면 필수.

탭 그대로: Product / Bundle private / Deposit.

API: `POST /shopping/privateInventory/getConfirmationWithCost`, 결제 `payBalanceV2` `orderType=9`(웹 목록 `orderType=2`와 다름 — 주문 패리티 문서와 동일).

HQ 경로 후보: `/hq/pipeline/catalog` 하위 「내 재고」 또는 소싱발주 재고 탭과 조인. **평가액(Value)은 CJ 월렛/원가. LEXI 마진에 더하지 않음.**

선매입 안 하면 이 화면은 숨김.

### P1 — 소싱 리스트 (미발견 상품)

[요청 방법](https://blog.cjdropshipping.com/detail/how-to-post-sourcing-requests-on-cj-dropshipping-updated): My CJ 폼 또는 크롬 확장. 플랫폼 필터는 캡처와 동일(CJ/1688/Taobao/AliExpress/eBay/QK).

OpenAPI에 **소싱 요청 CRUD가 없음**(2026-08 조사). HQ는:

1. 「CJ에서 열기」 딥링크 + 플랫폼 칩만.
2. 수동으로 URL·상태(접수/소싱중/CJ상품연결) 메모.
3. 성공 시 `pid`를 카탈로그 인덱스로 import.

자동 목록 동기화는 API가 생긴 뒤에.

### P2 — CJ Brands 디렉터리

LEXI `/brands`와 무관. 필요할 때만 공급처 필터. 우선순위 낮음.

## HQ에 둘 위치

| 기능 | 경로 | 내비 |
|------|------|------|
| 창고별 공개 재고·경보 | 카탈로그 인덱스 컬럼 | 기존 |
| 내 인벤토리 | 카탈로그 보조 보드 또는 소싱발주 재고 | 선매입 시에만 |
| 소싱 티켓 | 공급처 옆 「CJ 소싱요청」 또는 카탈로그 빈 검색 CTA | 딥링크 중심 |
| Factories | `/hq/suppliers` | 유지 |

주문·월렛은 `docs/hq-cj-order-parity.md`가 담당. 이 문서는 상품/재고/미발견 소싱만.

## 구현 순서

1. `queryByVid` / `enable_inventory`로 카탈로그 경보.
2. CJ 인벤토리·소싱 페이지 딥링크.
3. 선매입 결정 후 privateInventory 보드.
4. 소싱 티켓 메모(API 없으면 수동).

## 구현 상태 (2026-08-20)

- 카탈로그: `stockAlert` = 미확인|품절|부족|정상. 크롤은 `listedNum`을 재고로 쓰지 않음. Import·`POST /api/hq/catalog/stock-refresh`만 `stockVerified`.
- 딥링크: 카탈로그 상단 CJ 인벤토리 / 소싱 리스트 + HQ 내 재고·소싱요청.
- 내 재고: `/hq/cj-inventory` — 선매입 원장. `privateInventory/list` 없으면 빈 목록 + CJ 링크.
- 소싱요청: `/hq/cj-sourcing` — 수동 티켓. API 동기화 없음.

관련: `docs/hq-suppliers-providers.md`, `docs/lexi-dropship-integration-spec.md`.
