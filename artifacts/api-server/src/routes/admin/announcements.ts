import { Router, type IRouter } from "express";
import { db, announcementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

function fmt(a: typeof announcementsTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/admin/announcements", requireAdmin, async (_req, res): Promise<void> => {
  const items = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  res.json(items.map(fmt));
});

router.post("/admin/announcements", requireAdmin, async (req, res): Promise<void> => {
  const { title, message, isActive = true } = req.body;
  if (!title || !message) { res.status(400).json({ error: "Titre et message requis" }); return; }

  const [item] = await db.insert(announcementsTable).values({ title, message, isActive }).returning();
  res.status(201).json(fmt(item));
});

router.put("/admin/announcements/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, message, isActive } = req.body;
  const updates: any = {};
  if (title) updates.title = title;
  if (message) updates.message = message;
  if (isActive !== undefined) updates.isActive = isActive;

  const [item] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Annonce non trouvée" }); return; }
  res.json(fmt(item));
});

router.delete("/admin/announcements/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ success: true, message: "Annonce supprimée" });
});

export default router;
