ALTER TABLE auth_identities
  DROP CONSTRAINT IF EXISTS auth_identities_provider_check;

ALTER TABLE auth_identities
  ADD CONSTRAINT auth_identities_provider_check
  CHECK (provider IN ('phone', 'wechat', 'account', 'email'));

CREATE TABLE auth_password_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
