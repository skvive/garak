-- CommerceShorts 테이블 (src/db/schema.ts 와 동일). 추가 전용·재실행 안전.
CREATE TABLE IF NOT EXISTS short_accounts (
  email text PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free',
  credits integer NOT NULL DEFAULT 2,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS short_products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_email text NOT NULL,
  source_url text NOT NULL DEFAULT '',
  title text NOT NULL,
  price_amount numeric(12,2),
  currency char(3) NOT NULL DEFAULT 'KRW',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS short_video_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_email text NOT NULL,
  product_id bigint NOT NULL,
  template text NOT NULL,
  script_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 5,
  strategy text NOT NULL DEFAULT 'remotion',
  wan_task_id text,
  wan_video_url text,
  watermark boolean NOT NULL DEFAULT true,
  final_video_url text,
  error text,
  credits_cost integer NOT NULL DEFAULT 1,
  refunded boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS short_video_jobs_owner_idx ON short_video_jobs (owner_email, id DESC);
CREATE INDEX IF NOT EXISTS short_video_jobs_queue_idx ON short_video_jobs (status, id);
