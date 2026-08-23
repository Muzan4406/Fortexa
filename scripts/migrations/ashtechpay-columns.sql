-- Fortexa: columns required by the AshtechPay provider.
-- Safe to run more than once; it does not touch users or transactions.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS ashtechpay_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS active_deposit_provider text NOT NULL DEFAULT 'sendavapay';