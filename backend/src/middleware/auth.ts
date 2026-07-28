import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../types/shared.js";
import { HttpError } from "../utils/http.js";

type JwtPayload = {
  id: number;
  email: string;
  role: Role;
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    throw new HttpError(401, "Authentication required");
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, "You do not have permission to perform this action");
    }
    next();
  };
}
