CREATE TABLE IF NOT EXISTS studio_assets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_email text NOT NULL,
  kind text NOT NULL,
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  result_url text,
  task_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_assets_owner_idx ON studio_assets (owner_email, id DESC);
