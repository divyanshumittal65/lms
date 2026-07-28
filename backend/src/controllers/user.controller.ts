import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../database/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
import { logActivity } from "../utils/activity.js";
import { HttpError, ok } from "../utils/http.js";
import { getPagination } from "../utils/pagination.js";
import { userStatusSchema } from "../validators/catalog.schema.js";

export const listUsers = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const search = `%${String(req.query.search ?? "")}%`;
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, email, role, status, phone, created_at
       FROM users
       WHERE deleted_at IS NULL AND role = 'student'
         AND (name LIKE :search OR email LIKE :search)
       ORDER BY created_at DESC
       LIMIT :limit OFFSET :offset`,
      { search, limit, offset }
    );
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM users
       WHERE deleted_at IS NULL AND role = 'student'
         AND (name LIKE :search OR email LIKE :search)`,
      { search }
    );
    ok(res, "Users fetched", {
      items: rows,
      pagination: { page, limit, total: Number(countRows[0]?.total ?? 0) }
    });
  })
];

export const updateUserStatus = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = userStatusSchema.parse(req.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users SET status = :status WHERE id = :id AND role = 'student' AND deleted_at IS NULL`,
      { id: req.params.id, status: payload.status }
    );
    if (!result.affectedRows) throw new HttpError(404, "Student not found");
    await logActivity({ userId: req.user?.id, action: "user_status_updated", entityType: "user", entityId: Number(req.params.id), details: payload });
    ok(res, "User status updated");
  })
];
