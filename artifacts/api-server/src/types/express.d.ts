// Augment Express Request to carry authenticated user context
declare namespace Express {
  interface Request {
    userId?: number;
    userRole?: string;
  }
}
