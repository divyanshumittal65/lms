import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../database/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
import { logActivity } from "../utils/activity.js";
import { HttpError, ok } from "../utils/http.js";
import { authorSchema } from "../validators/catalog.schema.js";

export const listAuthors = asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, bio FROM authors WHERE deleted_at IS NULL ORDER BY name`
  );
  ok(res, "Authors fetched", rows);
});

export const createAuthor = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = authorSchema.parse(req.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO authors (name, bio) VALUES (:name, :bio)`,
      { name: payload.name, bio: payload.bio ?? null }
    );
    await logActivity({ userId: req.user?.id, action: "author_created", entityType: "author", entityId: result.insertId });
    ok(res, "Author created", { id: result.insertId, ...payload }, 201);
  })
];

export const updateAuthor = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = authorSchema.parse(req.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE authors SET name = :name, bio = :bio WHERE id = :id AND deleted_at IS NULL`,
      { id: req.params.id, name: payload.name, bio: payload.bio ?? null }
    );
    if (!result.affectedRows) throw new HttpError(404, "Author not found");
    await logActivity({ userId: req.user?.id, action: "author_updated", entityType: "author", entityId: Number(req.params.id) });
    ok(res, "Author updated");
  })
];

export const deleteAuthor = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE authors SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id AND deleted_at IS NULL`,
      { id: req.params.id }
    );
    if (!result.affectedRows) throw new HttpError(404, "Author not found");
    await logActivity({ userId: req.user?.id, action: "author_deleted", entityType: "author", entityId: Number(req.params.id) });
    ok(res, "Author deleted");
  })
];
