-- P4 Garak read-only forecast readiness gate. No customer fields, no writes.
-- Verified against Neon garakhansang public.orders/public.order_items, 2026-11-04.
-- IMPORTANT: orders.created_at is NOT necessarily payment timestamp.
-- A forecast additionally needs SKU-level daily verified sales (including zero days).
WITH paid_orders AS (
  SELECT id
  FROM public.orders
  WHERE status = 'paid' AND is_dummy = false AND deleted_at IS NULL
), verified_items AS (
  SELECT oi.product_id, oi.variant_sku, oi.qty
  FROM public.order_items AS oi
  INNER JOIN paid_orders AS po ON po.id = oi.order_id
  WHERE oi.is_dummy = false AND oi.deleted_at IS NULL AND oi.qty > 0
)
SELECT
  (SELECT COUNT(*) FROM paid_orders)::integer AS paid_order_count,
  (SELECT COUNT(*) FROM verified_items)::integer AS verified_line_item_count,
  (SELECT COUNT(DISTINCT product_id) FROM verified_items)::integer AS distinct_products,
  CASE
    WHEN (SELECT COUNT(*) FROM verified_items) = 0 THEN 'BLOCKED_NO_VERIFIED_SALES_LINES'
    ELSE 'MANUAL_REVIEW_REQUIRED_PAYMENT_TIMESTAMP_AND_ZERO_DAYS'
  END AS forecast_readiness;
