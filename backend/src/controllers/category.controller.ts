import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../database/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
import { logActivity } from "../utils/activity.js";
import { HttpError, ok } from "../utils/http.js";
import { categorySchema } from "../validators/catalog.schema.js";

export const listCategories = asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, description FROM categories WHERE deleted_at IS NULL ORDER BY name`
  );
  ok(res, "Categories fetched", rows);
});

export const createCategory = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = categorySchema.parse(req.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categories (name, description) VALUES (:name, :description)`,
      { name: payload.name, description: payload.description ?? null }
    );
    await logActivity({ userId: req.user?.id, action: "category_created", entityType: "category", entityId: result.insertId });
    ok(res, "Category created", { id: result.insertId, ...payload }, 201);
  })
];

export const updateCategory = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = categorySchema.parse(req.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categories SET name = :name, description = :description WHERE id = :id AND deleted_at IS NULL`,
      { id: req.params.id, name: payload.name, description: payload.description ?? null }
    );
    if (!result.affectedRows) throw new HttpError(404, "Category not found");
    await logActivity({ userId: req.user?.id, action: "category_updated", entityType: "category", entityId: Number(req.params.id) });
    ok(res, "Category updated");
  })
];

export const deleteCategory = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id AND deleted_at IS NULL`,
      { id: req.params.id }
    );
    if (!result.affectedRows) throw new HttpError(404, "Category not found");
    await logActivity({ userId: req.user?.id, action: "category_deleted", entityType: "category", entityId: Number(req.params.id) });
    ok(res, "Category deleted");
  })
];
