import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
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

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }
  res.json(formatUser(user));
});

router.put("/profile", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, email } = req.body;
  const updates: Partial<{ name: string; phone: string; email: string }> = {};

  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (email) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing && existing.id !== req.userId) {
      res.status(400).json({ error: "Cet email est déjà utilisé" });
      return;
    }
    updates.email = email;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  res.json(formatUser(updated));
});

router.put("/profile/password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Tous les champs sont requis" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Le nouveau mot de passe doit avoir au moins 6 caractères" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Mot de passe actuel incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, req.userId!));

  res.json({ success: true, message: "Mot de passe mis à jour" });
});

export default router;
