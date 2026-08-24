ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS maintenance_message TEXT NOT NULL DEFAULT 'Le site est temporairement en maintenance. Merci de revenir bientôt.';