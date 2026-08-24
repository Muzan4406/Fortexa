ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS whatsapp_support_url TEXT NOT NULL DEFAULT '';