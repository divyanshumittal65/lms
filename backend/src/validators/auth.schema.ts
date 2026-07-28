import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(80),
  phone: z.string().max(30).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "student"])
});
