# AMBA cast library (PDP)

lookbook-1000 **done** 컷 → SAMPLE3 `modelCast` face seeds.

```
public/casts/amba/
  index.json
  {id}_{eth}_{nat}_{sex}_{age}/
    face.webp
    meta.json
```

```bash
npm run casts:import-amba
# AMBASSADOR_ROOT=E:/cursor_HS/kcci/SITE/ambassador-ai-site npm run casts:import-amba
```

Code: `src/lib/pdp/amba-casts.ts`

월간 KCCI 패키지(`packages/kcci-submission`)와는 별층.
