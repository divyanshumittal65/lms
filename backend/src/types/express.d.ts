import type { Role } from "./shared.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
        email: string;
      };
    }
  }
}
