import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET must be configured before starting the API");
}

function getJwtSecret(): string {
  if (!JWT_SECRET) throw new Error("SESSION_SECRET must be configured before using authentication");
  return JWT_SECRET;
}

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// Extend Express Request to include user
declare module "express" {
  interface Request {
    userId?: number;
    userRole?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token invalide" });
    return;
  }
  req.userId = payload.userId;
  req.userRole = payload.role;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    // Read the current role from the database instead of trusting a possibly
    // stale JWT issued before an account was promoted to admin.
    void db
      .select({ role: usersTable.role, status: usersTable.status })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .then(([user]) => {
        if (!user || user.status !== "active" || user.role !== "admin") {
          res.status(403).json({ error: "Accès refusé" });
          return;
        }
        req.userRole = user.role;
        next();
      })
      .catch(() => {
        res.status(500).json({ error: "Impossible de vérifier les droits administrateur" });
      });
  });
}
