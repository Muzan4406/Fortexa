// Seed admin user for Fortexa
// Usage: pnpm --filter @workspace/scripts run seed-admin
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const res = await pool.query(
    `INSERT INTO users (name, phone, email, password_hash, role, status, referral_code, referred_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
     ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active'
     RETURNING id, email, role`,
    ['Administrateur', '', 'admin@fortexa.com', passwordHash, 'admin', 'active', 'ADMIN0000']
  );

  console.log('Admin user seeded:', res.rows[0]);
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
