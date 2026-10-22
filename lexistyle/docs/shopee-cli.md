# LEXI Shopee CLI

Shopee Open Platform v2를 프로젝트 내부에서 직접 호출한다. 인증값은 `.env.local`에서 읽고 출력하지 않는다.

```powershell
npm run shopee -- help
npm run shopee -- health
npm run shopee -- dashboard
npm run shopee -- products
npm run shopee -- orders --days 7
npm run shopee -- logistics
npm run shopee -- inventory --item-id 123456 --qty 10 --live
npm run shopee -- register --input .\tmp\shopee-products.json --live
```

조회 명령은 읽기 전용이다. `orders`는 최근 1~15일의 `READY_TO_SHIP` 주문 전체 페이지와 품목 상세를 조회한다. 상품 등록과 재고 변경은 `--live`가 없으면 실행되지 않는다. 등록 명령은 SKU로 기존 상품을 먼저 조회해 중복 생성을 막는다.

등록 JSON은 배열이며 각 항목에 `sku`, `title`, `description`, `categoryId`, `price`, `stock`, `weightKg`, `imageUrls`가 필요하다. `logisticId`는 항목 또는 `SHOPEE_LOGISTIC_ID`에서 지정한다. 가격은 해당 Shop 통화 기준이다.

```json
[
  {
    "sku": "LEXI-224",
    "title": "Product title",
    "description": "Product description",
    "categoryId": 100001,
    "logisticId": 80001,
    "price": 49.9,
    "stock": 10,
    "weightKg": 0.5,
    "imageUrls": ["https://example.com/product.jpg"]
  }
]
```

패션 상품의 실제 색상·사이즈 변형을 단일 기본 옵션으로 합치지 않는다. 공급처에서 실제 SKU와 재고를 확인할 수 없으면 등록 입력 파일을 만들지 않는다.
