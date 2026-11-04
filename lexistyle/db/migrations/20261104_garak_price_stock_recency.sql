-- Add perishables recency rules to existing evidence-based release gate.
-- Non-destructive CREATE OR REPLACE VIEW; no stock/order data is modified.
CREATE OR REPLACE VIEW public.garak_partner_release_ready AS
SELECT p.sku, p.merchant_slug, p.name, p.category_code,
       (
         p.status = 'approved' AND c.status = 'approved'
         AND p.visible IS TRUE AND p.purchasable IS TRUE
         AND p.image_verified IS TRUE AND p.stock > 0
         AND p.image_ref ~* '^https://'
         AND (
           SELECT count(DISTINCT e.evidence_type)
           FROM public.garak_partner_evidence e
           WHERE e.merchant_slug = p.merchant_slug
             AND e.sku IS NULL AND e.status='verified'
             AND e.evidence_type IN (
               'business_registration','signed_merchant_contract','photo_usage_rights',
               'cold_chain_plan','shipping_fee_policy','returns_refund_policy',
               'pg_settlement_reconciliation','pg_refund_rehearsal'
             )
         ) = 8
         AND (
           SELECT count(DISTINCT e.evidence_type)
           FROM public.garak_partner_evidence e
           WHERE e.merchant_slug = p.merchant_slug
             AND e.sku = p.sku AND e.status='verified'
             AND e.evidence_type IN (
               'product_real_photo','product_origin_weight',
               'product_price_agreement','product_stock_confirmation'
             )
         ) = 4
         -- Seafood inventory and market prices expire quickly. Reconfirm,
         -- even when the document itself was approved in the past.
         AND EXISTS (
           SELECT 1 FROM public.garak_partner_evidence e
           WHERE e.merchant_slug = p.merchant_slug AND e.sku = p.sku
             AND e.evidence_type='product_stock_confirmation'
             AND e.status='verified'
             AND e.reviewed_at >= NOW() - INTERVAL '24 hours'
         )
         AND EXISTS (
           SELECT 1 FROM public.garak_partner_evidence e
           WHERE e.merchant_slug = p.merchant_slug AND e.sku = p.sku
             AND e.evidence_type='product_price_agreement'
             AND e.status='verified'
             AND e.reviewed_at >= NOW() - INTERVAL '72 hours'
         )
       ) AS release_ready
FROM public.garak_partner_products p
JOIN public.garak_partner_categories c ON c.code = p.category_code;
