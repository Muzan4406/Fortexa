// Seed admin user for Fortexa
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status, referral_code)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active'
     RETURNING id, email, role`,
    ['Administrateur', 'admin@fortexa.com', passwordHash, 'admin', 'active', 'ADMIN0000']
  );
  
  console.log('Admin user seeded:', res.rows[0]);
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
