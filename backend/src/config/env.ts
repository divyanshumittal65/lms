import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(12).default("development-secret-change-me"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("library_management_system"),
  ADMIN_EMAIL: z.string().email().default("admin@library.test"),
  ADMIN_PASSWORD: z.string().min(8).default("Admin@12345")
});

export const env = envSchema.parse(process.env);
