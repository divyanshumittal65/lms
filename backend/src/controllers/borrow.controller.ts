import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "../database/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
import { logActivity } from "../utils/activity.js";
import { addDays, calculateFine, toSqlDate } from "../utils/dates.js";
import { HttpError, ok } from "../utils/http.js";
import { getPagination } from "../utils/pagination.js";

const borrowSchema = z.object({
  bookId: z.number().int().positive(),
  userId: z.number().int().positive().optional()
});

async function getBorrowDurationDays() {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT setting_value FROM settings WHERE setting_key = 'borrow_duration_days' LIMIT 1`
  );
  return Number(rows[0]?.setting_value ?? 14);
}

export const listBorrows = [
  requireAuth,
  asyncHandler(async (req, res) => {
    await pool.execute(
      `UPDATE borrow_records
       SET status = 'overdue'
       WHERE status = 'borrowed' AND return_date IS NULL AND due_date < CURRENT_DATE`
    );

    const { page, limit, offset } = getPagination(req.query);
    const isAdmin = req.user?.role === "admin";
    const params = {
      userId: isAdmin && req.query.userId ? Number(req.query.userId) : isAdmin ? null : (req.user?.id ?? null),
      status: req.query.status ? String(req.query.status) : null,
      limit,
      offset
    };

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT br.id, br.issue_date, br.due_date, br.return_date, br.fine, br.status,
              u.name AS student, u.email,
              bc.accession_no,
              b.title, b.isbn
       FROM borrow_records br
       JOIN users u ON u.id = br.user_id
       JOIN book_copies bc ON bc.id = br.copy_id
       JOIN books b ON b.id = bc.book_id
       WHERE (:userId IS NULL OR br.user_id = :userId)
         AND (:status IS NULL OR br.status = :status)
       ORDER BY br.created_at DESC
       LIMIT :limit OFFSET :offset`,
      params
    );

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM borrow_records br
       WHERE (:userId IS NULL OR br.user_id = :userId)
         AND (:status IS NULL OR br.status = :status)`,
      params
    );

    ok(res, "Borrow records fetched", {
      items: rows,
      pagination: { page, limit, total: Number(countRows[0]?.total ?? 0) }
    });
  })
];

export const borrowBook = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = borrowSchema.parse(req.body);
    const targetUserId = req.user?.role === "admin" && payload.userId ? payload.userId : req.user?.id;
    if (!targetUserId) throw new HttpError(401, "Authentication required");

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [copies] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM book_copies
         WHERE book_id = :bookId AND status = 'available' AND deleted_at IS NULL
         ORDER BY id LIMIT 1 FOR UPDATE`,
        { bookId: payload.bookId }
      );
      const copy = copies[0];
      if (!copy) throw new HttpError(409, "No available copy for this book");

      const issueDate = new Date();
      const dueDate = addDays(issueDate, await getBorrowDurationDays());
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO borrow_records (user_id, copy_id, issue_date, due_date, status)
         VALUES (:userId, :copyId, :issueDate, :dueDate, 'borrowed')`,
        {
          userId: targetUserId,
          copyId: copy.id,
          issueDate: toSqlDate(issueDate),
          dueDate: toSqlDate(dueDate)
        }
      );
      await connection.execute(`UPDATE book_copies SET status = 'borrowed' WHERE id = :copyId`, {
        copyId: copy.id
      });
      await connection.commit();
      await logActivity({
        userId: req.user?.id,
        action: "book_borrowed",
        entityType: "borrow_record",
        entityId: result.insertId,
        details: { bookId: payload.bookId, copyId: copy.id, targetUserId }
      });
      ok(res, "Book borrowed", { id: result.insertId, dueDate: toSqlDate(dueDate) }, 201);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
];

export const returnBook = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const borrowId = Number(req.params.id);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT br.*, bc.id AS copy_id
         FROM borrow_records br
         JOIN book_copies bc ON bc.id = br.copy_id
         WHERE br.id = :id AND br.status != 'returned'
           AND (:isAdmin = TRUE OR br.user_id = :userId)
         LIMIT 1 FOR UPDATE`,
        { id: borrowId, isAdmin: req.user?.role === "admin", userId: req.user?.id ?? 0 }
      );
      const borrow = rows[0];
      if (!borrow) throw new HttpError(404, "Active borrow record not found");

      const returnDate = new Date();
      const fine = calculateFine(new Date(borrow.due_date), returnDate);
      await connection.execute(
        `UPDATE borrow_records
         SET return_date = :returnDate, fine = :fine, status = 'returned'
         WHERE id = :id`,
        { id: borrowId, returnDate: toSqlDate(returnDate), fine }
      );
      await connection.execute(`UPDATE book_copies SET status = 'available' WHERE id = :copyId`, {
        copyId: borrow.copy_id
      });
      await connection.commit();
      await logActivity({
        userId: req.user?.id,
        action: "book_returned",
        entityType: "borrow_record",
        entityId: borrowId,
        details: { fine }
      });
      ok(res, "Book returned", { fine });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
];
