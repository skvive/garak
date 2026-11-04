-- Gwangyang / Garak seller compliance evidence. Non-destructive migration.
-- All evidence starts as submitted, never as verified. Media/contract claims require human inspection.
CREATE TABLE IF NOT EXISTS public.garak_partner_evidence (
  id BIGSERIAL PRIMARY KEY,
  merchant_slug TEXT NOT NULL,
  sku TEXT REFERENCES public.garak_partner_products(sku) ON DELETE RESTRICT,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'business_registration',
    'signed_merchant_contract',
    'photo_usage_rights',
    'cold_chain_plan',
    'shipping_fee_policy',
    'returns_refund_policy',
    'pg_settlement_reconciliation',
    'pg_refund_rehearsal',
    'product_real_photo',
    'product_origin_weight',
    'product_price_agreement',
    'product_stock_confirmation'
  )),
  evidence_url TEXT NOT NULL CHECK (evidence_url ~ '^https://'),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','verified','rejected')),
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  CHECK (
    (sku IS NULL AND evidence_type IN (
      'business_registration','signed_merchant_contract','photo_usage_rights',
      'cold_chain_plan','shipping_fee_policy','returns_refund_policy',
      'pg_settlement_reconciliation','pg_refund_rehearsal'
    ))
    OR
    (sku IS NOT NULL AND evidence_type IN (
      'product_real_photo','product_origin_weight','product_price_agreement','product_stock_confirmation'
    ))
  ),
  CHECK (status <> 'verified' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (status <> 'verified' OR reviewed_by <> submitted_by)
);
CREATE INDEX IF NOT EXISTS garak_partner_evidence_by_merchant
  ON public.garak_partner_evidence (merchant_slug, evidence_type, status);
CREATE INDEX IF NOT EXISTS garak_partner_evidence_by_sku
  ON public.garak_partner_evidence (sku, evidence_type, status)
  WHERE sku IS NOT NULL;
-- This view is the authoritative RELEASE GATE: no admin-only form can bypass it.
-- Source product must also be approved, visible, available, rights-cleared and linked to verified original photo.
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
       ) AS release_ready
FROM public.garak_partner_products p
JOIN public.garak_partner_categories c ON c.code = p.category_code;
