import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import transactionsRouter from "./transactions";
import referralsRouter from "./referrals";
import profileRouter from "./profile";
import announcementsRouter from "./announcements";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(transactionsRouter);
router.use(referralsRouter);
router.use(profileRouter);
router.use(announcementsRouter);
router.use(adminRouter);

export default router;
