# 가락한상숍 · 광양수산 상용화 검증 및 인수인계 (2026-11-04)

## 시스템 정본
- 운영: https://garak.lexid.site (Vercel `garakhs`)
- GitHub: `skvive/garak` (`lexistyle/`)
- 검증한 Neon 프로젝트: `mute-darkness-67529424` (운영 연결은 `/api/health/commerce`로 별도 확인)
- 상품 원본: Google Drive [광양수산 47종 메뉴 폴더](https://drive.google.com/drive/folders/1co11Pqld6Za7XXmdtrIrTq4xSuRcWOTT), 이 중 11~47번 37종만 광양수산으로 분리
- 현장 조사: [GARAKMALL_FIELD_PHOTO_DATA_20261101.xlsx](https://drive.google.com/file/d/1agxuzox_KgVtmaOLmOVJ3xCzq2z7TdE2/view)

## 실제 확인된 것
- 광양수산 상호·사진 메뉴·수조·명함을 확인한 조사 원장에 가락몰 판매동 1층, 수산부 54호, 10호기 엘리베이터 앞 위치가 기재.
- 명함의 번호 일부가 가려져 공개할 수 없다. 31039.jpg/31040.jpg 자체가 이번 Drive 검색에서 직접 찾힌 것은 아니며 *조사 원장의 원본 사진 참조명*.
- 광양수산 상품 37건, 세부 분류 9개. 현재 승인/공개/구매 상품 0건.
- 별도 가락한상오더 Neon `dawn-paper-21288363`의 13개 점포는 모두 pending·미검증. 44개 published 샘플 상품이 검증된 실제 입점이라는 증거는 아님.
- Vercel 기존 주문 5건에 해당하는 읽기 DB 기록: mock/paid 3건, Stripe/pending_payment 2건. Stripe pending은 결제 성공 증거가 아님.
- 공식 계약서 마크다운 [입점계약서 서식](https://drive.google.com/file/d/1vCg-XL92OLxAEY6lxVY9MoJKvz7GSoRz/view)은 을 서명·날인이 없는 빈 양식. [입점신청서](https://drive.google.com/file/d/1XOr8SbD6A3lVSrPxn58lLLJUaHWlB02m/view)도 미작성 양식.
- [점포 상품 GPS 현장검증서](https://drive.google.com/file/d/1lrzbnC4Ju4lpChmecttLkfNCo91UL8Ag/view)는 승인 효력이 없는 검토용 초안.
- 광양수산 47종 AI 사진 ZIP은 실물 촬영·원산지·가격·재고·사진 사용권의 법적 증빙이 아님.

## 구현된 검증 절차
1. `public.garak_partner_evidence`에 증빙 자료를 URL로 접수. 외부 파일 내용이나 저작권을 자동 확인·승인하지 않는다.
2. 필수 8개 점포 공통 검증 유형:
   - 사업자 등록, 서명 입점 계약, 사진 사용권
   - 콜드체인 배송·보관 계획, 배송비/권역 약정, 환불 운영 정책
   - PG 실정산 대조 시험, PG 환불 시나리오 증빙
3. 필수 4개 상품별 검증 유형:
   - 실제 사진·사진 라이선스
   - 어종/원산지/중량 표시
   - 공급가격·판매가격 확인
   - 실재고 증빙
4. `status='submitted'`로만 생성된다. 검수자와 접수자의 이메일이 달라야 `verified`로 변경 가능하며, 검수 근거 메모가 필수.
5. `public.garak_partner_release_ready` DB VIEW가 8+4 모두 검증된 증빙, 승인된 카테고리와 상품, 사진 검증, 재고 > 0, HTTPS 실물 사진을 요구.
6. 상품별 재고 확인은 24시간, 가격 확인은 72시간 뒤 자동으로 오래된 증빙이 되어 추가 확인 없이는 공개 불가.
7. 운영 Checkout GET/POST는 기존대로 비활성. `release_ready`가 true로 바뀌어도 실결제는 자동 개방되지 않는다.

## 관리자 사용 방법
- 담당 관리자: `https://garak.lexid.site/hq/partners/gwangyang`
- 등록 계정: `kangjunchul8@gmail.com` (실제 Neon Auth 로그인·이메일 인증 필요)
- Google Drive에 실제 서명·가격·검수 원본 업로드 → 증빙 종류 + (상품별이라면 SKU) + 링크 + 메모 작성 → **미검증 증빙으로 접수**
- 다른 검증된 관리자 계정이 원문과 사진 사용 범위/영업상태/원산지 등을 실제로 확인 → 검수 근거 작성, 검증 또는 반려
- 본인 제출 증빙은 본인이 검증할 수 없음.
- 실물 사진은 개인정보 포함 가능성을 검토하고 사진 촬영·공개 동의 확보 후 상품 image URL로 별도 등록해야 함.

## 결제·배송·고객 고지 수용 조건
- 모든 판매가는 원화 KRW; 레거시 LEXI `price_usd`, 환율 변환, 통관 부호 로직은 국내 수산물 결제에 재사용 불가.
- 주문 생성은 승인된 SKU, 검증된 원화 단가, 실제 동시 재고 차감, 구매자 지역별 확정 배송비, 배차/콜드체인 조건 검증을 필요로 함.
- Toss 등 PG 테스트 환경에서: 결제 승인 → PG 거래내역/주문 금액 일치 → 취소·부분/전액 환불 → 정산장부 대조 후 별도 실운영 승인.
- 기존 mock 결제 `paid` 3건은 실제 정산 성공으로 집계 금지.
- 실물 사용권과 판매 가용성 확인 전 홈페이지는 연출 이미지로 표기하고 실제 상품을 판매 중인 것처럼 표시하지 않음.

## QA 및 장애 대응
- `/api/health/commerce`: 실제 배포가 `garak_partner_release_ready`가 존재하는 DB에 연결되었는지 점검(민감정보 비노출).
- `node scripts/qa-garak-commerce.mjs`: 주요 GET 페이지 및 신규 POST checkout 차단 검수. POST는 /api/checkout GET이 checkoutDisabled임을 확인한 뒤 빈 객체만 전송.
- 스크린샷 기반 모바일/데스크톱 시각 검수와 실제 Google 로그인/PG 샌드박스는 브라우저 및 실사용 계정 환경에서 별도 실행 필요.
- 기존 원본/주문/상품 레코드는 수정·삭제하지 않음.

## 외부 당사자가 제공해야 하는 증빙 (자동 생성 불가)
- **광양수산 점주/계약 담당:** 서명 계약·사업자 정보·실물 사진 이용 허락·실제 상품 규격/원산지/가격·실재고
- **물류 담당:** 냉장 포장·배송 권역·운임표·배차 및 사고/환불 기준의 확정 문서
- **결제 운영 담당:** 운영/테스트 PG 이용자 계정, 테스트 거래·환불·정산대조 자료
- **독립 검수 관리자:** 두 번째 이메일 인증된 관리자 계정, 증빙의 독립 확인 기록

이 중 하나라도 빠지면 판매는 계속 차단된다. 빈 양식 또는 AI 이미지를 검증된 증빙으로 변경하지 않는다.
