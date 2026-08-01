import { Router, type IRouter } from "express";
import { db, announcementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function formatAnnouncement(a: typeof announcementsTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/announcements", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(announcementsTable)
    .where(eq(announcementsTable.isActive, true))
    .orderBy(desc(announcementsTable.createdAt));
  res.json(items.map(formatAnnouncement));
});

export { formatAnnouncement };
export default router;
