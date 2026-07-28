import type { RowDataPacket } from "mysql2";
import { pool } from "../database/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
import { ok } from "../utils/http.js";

export const getDashboard = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    await pool.execute(
      `UPDATE borrow_records
       SET status = 'overdue'
       WHERE status = 'borrowed' AND return_date IS NULL AND due_date < CURRENT_DATE`
    );

    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM books WHERE deleted_at IS NULL) AS books,
        (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) AS categories,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL) AS users,
        (SELECT COUNT(*) FROM borrow_records WHERE status IN ('borrowed', 'overdue')) AS borrowed,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'available' AND deleted_at IS NULL) AS available`
    );
    const [activity] = await pool.execute<RowDataPacket[]>(
      `SELECT al.id, al.action, al.entity_type, al.created_at, u.name AS actor
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT 8`
    );
    ok(res, "Dashboard fetched", { stats: stats[0], activity });
  })
];
