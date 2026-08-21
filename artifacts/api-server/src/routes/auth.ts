import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { getSettings } from "../lib/settings";
import { nanoid } from "nanoid";

const router: IRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    country: u.country,
    email: u.email,
    referralCode: u.referralCode,
    referredById: u.referredById || null,
    investmentBalance: parseFloat(u.investmentBalance),
    gainBalance: parseFloat(u.gainBalance),
    status: u.status,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, phone, country, email, password, referralCode } = req.body;

  if (!name || !phone || !country || !email || !password) {
    res.status(400).json({ error: "Tous les champs sont requis" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit avoir au moins 6 caractères" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Cet email est déjà utilisé" });
    return;
  }

  let referredById: number | undefined;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
    if (referrer) {
      referredById = referrer.id;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newCode = nanoid(8).toUpperCase();

  const [user] = await db.insert(usersTable).values({
    name,
    phone,
    country: country ?? "",
    email,
    passwordHash,
    referralCode: newCode,
    referredById: referredById ?? 0,
    status: "active",
    role: "user",
  }).returning();

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  if (user.status === "banned") {
    res.status(401).json({ error: "Compte banni" });
    return;
  }
  if (user.status === "suspended") {
    res.status(401).json({ error: "Compte suspendu" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({ user: formatUser(user), token });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true, message: "Déconnecté" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }
  res.json(formatUser(user));
});

export { formatUser };
export default router;
