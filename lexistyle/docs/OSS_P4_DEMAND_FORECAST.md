# P4 — Garak demand forecast (opt-in, read-only)

Reuses existing Next.js storefront and src/lib/catalog/stock-alert.ts; no new model or DB migration.
A trusted operator exports a per-merchant/per-SKU JSON object with days [{date:"YYYY-MM-DD",quantity:0},...] and optional options. All daily sales, including zero-sale days, must be actual and consecutive. Need >=14 days; >=21 days enables a 7-day holdout WAPE. Baseline: 28-day smoothed weekday weighting and outlier cap. If verifiedOnHand is absent, NO reorder number is issued.

Offline CLI: cd lexistyle && npx tsx scripts/forecast-demand.ts <trusted-sales.json>
Tests (Node22): node --experimental-strip-types --test lexistyle/tests/test-demand-forecast.mjs from repo root.

No actual inventory API connection, auto-order, price change, customer prediction, TimesFM model integration or live sales testing. Validate a licensed real dataset and backtest WAPE before any commercial decision. Do not import noncommercial Kaggle contest datasets.
