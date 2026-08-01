---
name: Fortexa admin user seeding
description: How to create/recreate the admin user for Fortexa
---

## Admin credentials
- Email: admin@fortexa.com
- Password: admin123

## SQL seed (direct DB approach)
```sql
INSERT INTO users (name, email, phone, password_hash, role, status, referral_code, investment_balance, gain_balance)
VALUES ('Administrateur', 'admin@fortexa.com', '', '<bcrypt_hash>', 'admin', 'active', 'ADMIN0000', 0, 0)
ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active', password_hash = '<bcrypt_hash>'
```

## Generating bcrypt hash from api-server
```bash
cd artifacts/api-server && node --input-type=module << 'EOF'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('yourpassword', 10);
process.stdout.write(hash);
EOF
```

## Notes
- `phone` column is NOT NULL — pass empty string `''`
- `investment_balance` and `gain_balance` are numeric, default to 0
- `referral_code` must be unique — 'ADMIN0000' is reserved for admin

**Why:** Can't use the register API for admin (it creates regular users). Direct SQL + bcryptjs from api-server's node_modules is the path of least resistance.
