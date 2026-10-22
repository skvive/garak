# 고객 공개 배송추적 페이지 기획 (CJ 추적 API → LEXI 인터페이스)

기준일: 2026-10-16. 상태: **P0~P2 구현 완료**(P3 쿠팡 구매자 자동 안내는 미착수). 코드: `src/lib/hq/track-public.ts`(순수 로직), `track-sync.ts`(크론 갱신·알림), 공개 페이지 `src/app/[lng]/track/[token]`.

## 1. 분석 (확인된 사실)

| 항목 | 내용 | 출처 |
|------|------|------|
| CJ 추적 API | `GET /logistic/trackInfo?trackNumber=` → `trackingStatus`, `logisticName`, `cjMailNo`, `routes[{acceptTime, acceptAddress, remark}]`, `trackingFrom/To`, `deliveryDay`, `lastMileCarrier` | 실호출 (이동 중 소포 routes 18건, 출고 전 소포는 Processing만) |
| `lastMileCarrier` | 현재까지 호출한 3건 모두 `null` → 구간 택배사는 API로 알 수 없음 | 실호출 |
| 상태 단계 | Processing → Dispatched → En Route → Arrived Courier Facility → Out for Delivery → Available for Pickup → Unsuccessful Delivery … | CJ Track Orders 화면 |
| remark 언어 | 영문 (예: "Arrive at the mail processing center") | 실호출 |
| HQ 보유 데이터 | `SourcingOrder.trackingNo`, `logisticName`, `cjStatus`, 30분 크론(`order-sync`)이 CJ 상태·운송장 동기화 | 코드 |
| 몰 고객 주문 | `AccountOrder.tracking[{carrier, trackingNumber, status}]` 이미 존재, `/account/orders/[id]` 로그인 필요 | 코드 |
| 공개 추적 | 없음. 토큰 필드도 없음 | 코드 |
| 쿠팡 구매자 | LEXI 계정 없음. Wing `DIRECT`(업체직송)는 쿠팡 내 추적 링크 없음 → 별도 링크 안내 필요 | Wing 실측 |
| CJ API 한도 | 주문 API 2회/초 (추적 API 한도는 미확인) | 기존 문서 |

고객 노출 금지(전역 규칙): `CJ`, `CJ Dropshipping`, 원가, 내부 ID. `CJPacket` 같은 물류명에도 CJ가 들어가므로 고객 화면에서는 "국제특송"으로 표기.

## 2. 설계

```
CJ 결제 완료(UNSHIPPED·PENDING 이상) → 공개 토큰 발급 → 고객 안내 링크
크론(30분) ─ trackInfo 조회(1.2초 간격, 미배송 건만) → 추적 스냅샷 저장
고객 브라우저 → /[lng]/track/[token] → 스냅샷만 읽어 렌더 (CJ 호출 없음)
```

- **방문마다 CJ를 호출하지 않는다.** 스냅샷(`trackingSnapshot`: status, routes, fetchedAt)만 읽는다. CJ 자격증명 노출·한도 소진·악용 방지.
- **토큰**: 128비트 난수(base62). 주문번호·운송장·구매요청 ID를 URL에 쓰지 않는다. `publicTrackToken`을 소싱발주 `orderPayload`에 저장(스키마 변경 없음).
- **개인정보**: 수취인 `고*수` 마스킹, 주소·전화 미표시, 원가·CJ 표기 없음. `noindex`, 응답 헤더 `Cache-Control: private`.
- **만료**: 배송완료 후 90일(굿스플로도 3개월 지난 번호는 조회 불가). 만료·무효 토큰은 동일한 404.
- **상태 매핑 (고객 5단계)**: 결제완료 → 상품준비중(Processing/Pending) → 출고(Dispatched) → 해외 이동(En Route·Arrived Courier Facility) → 배달중(Out for Delivery)/수령대기(Available for Pickup) → 배송완료. `Unsuccessful Delivery`는 경고 배지.
- **타임라인**: remark 영→한 매핑 표(미등록 문구는 원문 유지). 시각은 CJ가 준 값을 그대로 표시하고 "운송 정보 기준"으로 안내(타임존 미확인이라 KST로 변환하지 않음).
- **예상 도착**: 표시하지 않음. CJ `deliveryDay`는 도착 예정이 아니라 경과일로 보여 근거가 부족하다.

### 화면 (모바일 우선, 화이트톤, 한글 타이포 규칙 적용)
상단 주문 요약(상품명·옵션, `LEXI 소싱`) → 5단계 스텝퍼 → 운송장 번호 + 복사 버튼 → 타임라인 → 마지막 갱신 시각 → "외부 사이트에서 상세 조회"(17track) 보조 링크.

## 3. 안내 채널

| 채널 | 방법 | 비고 |
|------|------|------|
| LEXI 몰 | `/account/orders/[id]`에 링크 표시 + 출고 시 알림(`notifications`) | 코드 있음 |
| 쿠팡 | HQ 발주 보드에 "고객 안내 문구 복사"(링크 포함) → 수동 안내 | 쿠팡이 구매자에게 임의 메시지를 보내는 API 가능 여부는 **미확인**, P3에서 조사 |
| HQ 내부 | 현재 17track 링크를 자체 페이지 링크로 교체 | |

## 4. 구현 계획

| 단계 | 내용 | 완료 기준 |
|------|------|-----------|
| P0 | 토큰 발급, 스냅샷 필드, 크론에 `trackInfo` 조회 추가(미배송 건·1.2초 간격) | 실제 주문 2건에서 스냅샷 저장 확인 |
| P1 | 공개 페이지 `/[lng]/track/[token]` + 상태·문구 매핑 + 마스킹 | 모바일/데스크톱 렌더, 만료 404 |
| P2 | 몰 주문 페이지 링크, 알림, HQ 복사 버튼 | 링크로 공개 페이지 열림 |
| P3 | 쿠팡 구매자 안내 자동화 조사 | API 가능 여부 결론 |

테스트: 상태 매퍼, 토큰 생성/검증, 마스킹, 만료. 픽스처는 이동 이력이 있는 실제 응답(개인정보 제외) 사용. 검증: `npm run check` + 운영 URL 확인.

## 5. 리스크 / 미결정

- 출고 전에는 routes가 비어 "상품 준비중"만 표시 가능.
- `lastMileCarrier`가 비어 있어 현지 택배사 표기 불가.
- `trackInfo` 호출 한도 미확인 → 간격·배치 상한을 두고 첫 운영에서 측정.
- remark 영→한 번역 표는 점진 확장 필요.
- 쿠팡 `DIRECT` 송장 업로드의 API 수용 여부는 첫 출고 건에서 확인.
- 결제(CJ Pay)는 계속 수동. 이 기획은 결제를 자동화하지 않는다.

## 6. P3 조사 결과 — 쿠팡 구매자 자동 안내 (2026-10-16, 쿠팡 개발자센터 문서 기준)

**결론: 쿠팡 공식 API로 구매자에게 링크를 먼저 보내는 방법은 없다.** (문서에 SMS·알림톡·메시지 발송 API 없음)

| 항목 | 문서 내용 |
|------|-----------|
| 고객 문의 API | 상품별 고객문의·쿠팡 고객센터 문의 조회/답변 6종. **기존 문의에 대한 답변만** 가능(1문의 1답변, 2~1,000자). 판매자가 먼저 시작하는 API 없음 |
| 고객센터 문의 조회 | 응답에 `orderId`·`vendorItemId` 있음(주문과 연결 가능). 조회 기간 최대 7일, 24시간 미답변 시 쿠팡이 자동 종결 후 API 답변 불가 |
| 링크·전화번호 규정 | 답변 API 문서에 외부 링크 허용/금지 **언급 없음**(미확인) |
| 안심번호 | 주문서 `receiver.safeNumber`는 있으나 연락 규정·발송 API 문서 없음(미확인) |
| 택배사 코드 | `CAINIAO`·`YUNDA`·`SFC`·`SINOEX`·`YDH`·`ACIEXPRESS`·`EMS`·`DIRECT` 모두 API 코드로 존재 — **Wing 드롭다운의 `name`과 동일 확인**. 이 중 추적 비지원이 명시된 것은 `DIRECT`뿐(나머지의 추적 가능 여부는 문서에 없음) |
| **DIRECT 송장번호** | **숫자만 허용**(임의 숫자, 예 202002031830), 배송트래킹 미지원, 분리배송 불가(`NOT_ALLOW_VENDOR_DIRECT`) |
| **송장 엔드포인트** | 최초 업로드는 `POST .../orders/invoices`(상품준비중 대상). 현재 HQ가 쓰는 `.../orders/updateInvoices`는 **배송지시(DEPARTURE)·배송중·배송완료·업체직송 상태에서만** 동작(상품준비중이면 `INVALID_STATUS`). 본문 배열 키도 문서는 `orderSheetInvoiceApplyDtos`+`vendorItemId` 필수 |

### 발견한 결함 (미수정 — 승인 필요)
1. `DIRECT`로 보내는 송장번호가 `LP425900258CN`처럼 영문 포함 → 숫자 전용 규칙 위반 가능.
2. 최초 송장을 `updateInvoices`로 올리고 있어 상품준비중 주문에서는 `INVALID_STATUS` 가능. 본문 키(`orderSheetInvoiceList`)와 `vendorItemId` 누락도 문서와 다름.
- 영향: CJ가 `SHIPPED`가 되기 전에는 송장을 보내지 않으므로 아직 쿠팡에 잘못 올라간 데이터는 없음. 첫 출고 건에서 HQ 송장 오류 칸에 실패로 남는다.

### 실행 가능한 안내 방식 (효과순)
1. **고객센터 문의 자동 답변**: 문의가 오면 `orderId`로 소싱발주를 찾아 추적 링크를 답변에 넣는다. 24시간 제한, 링크 허용 여부 미확인 → 1건으로 시험.
2. **셀프 조회 페이지** `/track`: 쿠팡 주문번호 + 수취인 전화 끝 4자리로 토큰 페이지로 이동(레이트 리밋 필수). 상품 상세·문의 답변에서 이 주소만 안내.
3. **쿠팡 안에서 추적**: `CAINIAO` 등으로 등록해 구매자 앱에서 바로 추적(송장이 해당 택배사 전산에서 조회돼야 함, 미검증). 실패 시 `DIRECT`(추적 없음)로 대체.
4. 안심번호 문자 발송은 규정 미확인이라 보류.

### P3 후속 구현 (2026-10-16)
- 송장 결함 2건 수정: `DIRECT` 숫자 전용 변환, 최초 업로드 `orders/invoices` + 상자 내 전 품목 `vendorItemId`, 응답 `responseCode`/항목별 `succeed` 검사, 상품준비중이 아니면(`INVALID_STATUS`) `updateInvoices`로 대체. 코드: `src/lib/channels/coupang/invoice.ts`. 문서 기준 구현이며 실주문 전송은 미검증(첫 출고 건에서 확인).
- 셀프 조회 `/ko/track`: 주문번호 + 받는 분 성함(둘 다 일치) → 토큰 페이지. 쿠팡 구매자는 안심번호만 있어 전화번호 본인확인은 불가. 이름은 POST(서버 액션)로만 전송, 실패 메시지 단일화, IP당 10분 8회(인스턴스 메모리, 서버리스에서는 인스턴스별). 코드: `track-lookup.ts`, `app/[lng]/track/`.
