import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional().nullable()
});

export const authorSchema = z.object({
  name: z.string().min(2).max(120),
  bio: z.string().optional().nullable()
});

export const bookSchema = z.object({
  title: z.string().min(2).max(180),
  isbn: z.string().min(5).max(30),
  authorId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  publisher: z.string().min(2).max(140),
  publishedYear: z.number().int().min(1000).max(2100).optional().nullable(),
  description: z.string().optional().nullable(),
  copies: z.number().int().min(0).max(100).optional()
});

export const copyStatusSchema = z.object({
  status: z.enum(["available", "borrowed", "maintenance", "lost"])
});

export const userStatusSchema = z.object({
  status: z.enum(["active", "blocked"])
});

export const settingsSchema = z.object({
  borrowDurationDays: z.number().int().min(1).max(90)
});
