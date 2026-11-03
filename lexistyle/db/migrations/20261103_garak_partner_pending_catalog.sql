-- 광양수산 신규 상품 승인대기 전용 원장. 쇼핑몰 public.products와 분리.
-- 승인·원산지/이미지/재고 검수 전에는 어떤 상품도 고객에게 노출하거나 판매하지 않는다.
CREATE TABLE IF NOT EXISTS public.garak_partner_categories (
  code TEXT PRIMARY KEY,
  merchant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_path TEXT NOT NULL DEFAULT '수산 > 회·활어 > 광양수산',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_slug, name)
);

CREATE TABLE IF NOT EXISTS public.garak_partner_products (
  sku TEXT PRIMARY KEY,
  merchant_slug TEXT NOT NULL,
  source_no INTEGER NOT NULL,
  category_code TEXT NOT NULL REFERENCES public.garak_partner_categories(code),
  name TEXT NOT NULL,
  description TEXT,
  price_krw INTEGER NOT NULL CHECK (price_krw > 0),
  currency CHAR(3) NOT NULL DEFAULT 'KRW' CHECK (currency='KRW'),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  visible BOOLEAN NOT NULL DEFAULT FALSE,
  purchasable BOOLEAN NOT NULL DEFAULT FALSE,
  image_ref TEXT,
  image_verified BOOLEAN NOT NULL DEFAULT FALSE,
  qa_notes TEXT,
  source_file TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_slug, source_no),
  CHECK (NOT visible OR (status='approved' AND image_verified)),
  CHECK (NOT purchasable OR (visible AND status='approved' AND image_verified AND stock>0))
);

CREATE INDEX IF NOT EXISTS garak_partner_products_category_idx ON public.garak_partner_products (merchant_slug, category_code);
CREATE INDEX IF NOT EXISTS garak_partner_products_status_idx ON public.garak_partner_products (status, visible, purchasable);
