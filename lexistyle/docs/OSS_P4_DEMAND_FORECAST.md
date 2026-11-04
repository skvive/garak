# P4 — Garak demand forecast (opt-in, read-only)

Reuses existing Next.js storefront and src/lib/catalog/stock-alert.ts; no new model or DB migration.
A trusted operator exports a per-merchant/per-SKU JSON object with days [{date:"YYYY-MM-DD",quantity:0},...] and optional options. All daily sales, including zero-sale days, must be actual and consecutive. Need >=14 days; >=21 days enables a 7-day holdout WAPE. Baseline: 28-day smoothed weekday weighting and outlier cap. If verifiedOnHand is absent, NO reorder number is issued.

Offline CLI: cd lexistyle && npx tsx scripts/forecast-demand.ts <trusted-sales.json>
Tests (Node22): node --experimental-strip-types --test lexistyle/tests/test-demand-forecast.mjs from repo root.

No actual inventory API connection, auto-order, price change, customer prediction, TimesFM model integration or live sales testing. Validate a licensed real dataset and backtest WAPE before any commercial decision. Do not import noncommercial Kaggle contest datasets.

## 2026-11-04 live Neon source-readiness audit (read-only)

- Actual connected project: `garakhansang` (Neon project `mute-darkness-67529424`), schemas `public.orders`, `public.order_items` verified from database metadata; this is a **source diagnosis only**.
- Execute only `scripts/check-paid-sales-readiness.sql` in a read-only SQL session. The query selects *aggregated counts*, never customers, contact information, or delivery addresses; it has no mutations.
- Verified result: **3** non-dummy `paid` orders, **0** non-dummy/non-deleted positive-quantity paid order item rows, **0** products with sales; `BLOCKED_NO_VERIFIED_SALES_LINES`.
- Never fill these missing line items with synthetic records or show a forecast as operationally verified. Ensure item persistence, payment timestamp provenance, seller/merchant identity and daily zero-sales completeness are validated before any SKU-series extraction or forecast training.
- Current `orders.created_at` is the *order creation* time, not necessarily the payment completion time. The baseline model must not treat it as a verified payment timestamp.
