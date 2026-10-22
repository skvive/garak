# CJ 상품 콘텐츠 매핑 복구

## 원인

- `catalog_index.product_id`가 상품 slug에 포함된 CJ external ID와 다른 행을 가리키는 사례가 있었다.
- `products.category_id`를 로컬 숫자 ID 그대로 Neon에 전송해 DB별 자동증가 ID가 어긋났다. 상품은 정상인데 Neon에서 다른 카테고리 또는 빈 카테고리로 보였다.
- PDP 문서가 없는 상품은 `product_images.sort=0`을 사용하므로, 이 값이 다른 CJ 원본을 가리키면 제목과 대표 이미지가 함께 어긋난다.
- CJ가 동일 external ID의 상품 정보를 갱신한 경우 기존 slug·이름이 현재 CJ 제목과 달라질 수 있다.
- slug prefix 기반 SAMPLE3 오버라이드가 상품 정정 후에도 남아 있으면, 현재 CJ 상품 위에 이전 상품의 AI 화보를 덮어쓴다. `sample3-batch-data.json`도 같은 기준으로 확인해야 한다.

## 복구 규칙

1. 상품 slug의 CJ ID와 `catalog_index`의 source URL/external ID가 일치하는 단일 행만 정본으로 사용한다.
2. 카테고리는 숫자 ID가 아니라 category slug로 Neon에 upsert한 뒤 상품에 Neon ID를 주입한다.
3. 생성·게시된 PDP 문서는 그대로 두고, 문서가 없는 상품의 대표 이미지만 CJ `primary_thumb_url`의 rehost 이미지로 교체한다.
4. 중복 catalog 행은 CJ ID가 일치하는 행을 남기고 나머지는 연결을 해제한다. 같은 CJ ID를 가진 중복 상품은 soft-delete한다.
5. 번역/마케팅명이 가능한 상품은 이름을 보존하고, 확인된 오염 행만 CJ 원본 제목으로 복구한다.
6. 현재 CJ 제목과 이미지가 확인된 stale PDP 오버라이드는 제거하고, 필요한 경우 CJ 대표 이미지로 되돌린다.

## 검증 명령

```bash
npm run audit:cj-content
npm run repair:cj-content
npm run db:sync:categories-neon
npm run db:sync:cj-repair-products-neon
npm run db:sync:neon -- --tables=product_images,catalog_index
```

감사 결과는 `tmp/cj-content-mapping-audit.json`에 생성되며, Neon 실행 시에는 `--allow-remote=1`을 붙인다.
