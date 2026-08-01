import { Router, type IRouter } from "express";
import statsRouter from "./stats";
import usersRouter from "./users";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import settingsRouter from "./settings";
import announcementsRouter from "./announcements";

const router: IRouter = Router();

router.use(statsRouter);
router.use(usersRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(settingsRouter);
router.use(announcementsRouter);

export default router;
