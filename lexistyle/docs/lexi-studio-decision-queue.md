# LEXI Studio 결정 대기열

구현을 중단하지 않고 기본값으로 진행한 뒤, 운영 전 확정할 항목이다.

| ID | 우선순위 | 질문 | 현재 기본값 | 상태 |
|---|---|---|---|---|
| D-001 | 높음 | Cafe24 실운영 mall ID와 shop_no는? | 환경변수 값 사용, 미설정 시 preview | open |
| D-002 | 높음 | Cafe24 스킨을 직접 수정할 권한까지 앱 scope에 포함할 것인가? | 상품 상세 게시만 활성화 | open |
| D-003 | 높음 | Vercel Blob 또는 별도 CDN 중 미디어 저장소는? | URL 등록 + Blob 토큰 존재 시 Blob | open |
| D-004 | 높음 | 기존 Toss/Stripe/Danal 정산 완료 시점과 제거일은? | legacy 보존, Studio에서 숨김 | open |
| D-005 | 중간 | AI 이미지 생성 공급자는? | provider-neutral job 계약 | open |
| D-006 | 중간 | Remotion 렌더 워커 배포 위치는? | 기존 `services/remotion` 계약 | open |
| D-007 | 중간 | 콘텐츠 최종 승인 권한자는 누구인가? | `ADMIN_EMAILS` 관리자 | open |
| D-008 | 중간 | 다국어 PDP 우선 언어는? | ko 원본 + en 배포 준비 | open |
| D-009 | 낮음 | Next 스토어 preview 종료일은? | Cafe24 구매 회귀검증 완료 후 | open |
| D-010 | 낮음 | 성과 데이터 원천은 Cafe24 Analytics 또는 광고 채널 중 무엇인가? | 수동 성과 기록 API | open |
