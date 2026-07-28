import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../database/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async.js";
import { logActivity } from "../utils/activity.js";
import { HttpError, ok } from "../utils/http.js";
import { getPagination } from "../utils/pagination.js";
import { bookSchema, copyStatusSchema } from "../validators/catalog.schema.js";

const sortColumns = new Set(["title", "author", "category", "isbn", "created_at"]);

export const listBooks = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const sortBy = sortColumns.has(String(req.query.sortBy)) ? String(req.query.sortBy) : "title";
  const sortOrder = String(req.query.sortOrder).toLowerCase() === "desc" ? "DESC" : "ASC";
  const search = `%${String(req.query.search ?? "")}%`;
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const authorId = req.query.authorId ? Number(req.query.authorId) : null;

  const params = { categoryId, authorId, search, limit, offset };

  const where = `
    b.deleted_at IS NULL
    AND (:categoryId IS NULL OR b.category_id = :categoryId)
    AND (:authorId IS NULL OR b.author_id = :authorId)
    AND (
      b.title LIKE :search OR b.isbn LIKE :search OR
      a.name LIKE :search OR c.name LIKE :search
    )
  `;

  const orderExpr =
    sortBy === "author" ? "a.name" : sortBy === "category" ? "c.name" : `b.${sortBy}`;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT b.id, b.title, b.isbn, b.publisher, b.published_year, b.description,
            a.id AS author_id, a.name AS author,
            c.id AS category_id, c.name AS category,
            COUNT(bc.id) AS total_copies,
            SUM(CASE WHEN bc.status = 'available' AND bc.deleted_at IS NULL THEN 1 ELSE 0 END) AS available_copies
     FROM books b
     JOIN authors a ON a.id = b.author_id
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN book_copies bc ON bc.book_id = b.id AND bc.deleted_at IS NULL
     WHERE ${where}
     GROUP BY b.id
     ORDER BY ${orderExpr} ${sortOrder}
     LIMIT :limit OFFSET :offset`,
    params
  );

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM books b
     JOIN authors a ON a.id = b.author_id
     JOIN categories c ON c.id = b.category_id
     WHERE ${where}`,
    params
  );

  ok(res, "Books fetched", {
    items: rows,
    pagination: { page, limit, total: Number(countRows[0]?.total ?? 0) }
  });
});

export const getBook = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT b.*, a.name AS author, c.name AS category
     FROM books b
     JOIN authors a ON a.id = b.author_id
     JOIN categories c ON c.id = b.category_id
     WHERE b.id = :id AND b.deleted_at IS NULL LIMIT 1`,
    { id: req.params.id }
  );
  if (!rows[0]) throw new HttpError(404, "Book not found");

  const [copies] = await pool.execute<RowDataPacket[]>(
    `SELECT id, accession_no, status FROM book_copies WHERE book_id = :id AND deleted_at IS NULL ORDER BY accession_no`,
    { id: req.params.id }
  );

  ok(res, "Book fetched", { ...rows[0], copies });
});

export const createBook = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = bookSchema.parse(req.body);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO books (title, isbn, author_id, category_id, publisher, published_year, description)
         VALUES (:title, :isbn, :authorId, :categoryId, :publisher, :publishedYear, :description)`,
        {
          ...payload,
          publishedYear: payload.publishedYear ?? null,
          description: payload.description ?? null
        }
      );

      const copyCount = payload.copies ?? 1;
      for (let index = 1; index <= copyCount; index += 1) {
        await connection.execute(
          `INSERT INTO book_copies (book_id, accession_no) VALUES (:bookId, :accessionNo)`,
          { bookId: result.insertId, accessionNo: `${payload.isbn}-${String(index).padStart(3, "0")}` }
        );
      }
      await connection.commit();
      await logActivity({ userId: req.user?.id, action: "book_created", entityType: "book", entityId: result.insertId });
      ok(res, "Book created", { id: result.insertId }, 201);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
];

export const updateBook = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = bookSchema.omit({ copies: true }).parse(req.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE books
       SET title = :title, isbn = :isbn, author_id = :authorId, category_id = :categoryId,
           publisher = :publisher, published_year = :publishedYear, description = :description
       WHERE id = :id AND deleted_at IS NULL`,
      {
        ...payload,
        id: req.params.id,
        publishedYear: payload.publishedYear ?? null,
        description: payload.description ?? null
      }
    );
    if (!result.affectedRows) throw new HttpError(404, "Book not found");
    await logActivity({ userId: req.user?.id, action: "book_updated", entityType: "book", entityId: Number(req.params.id) });
    ok(res, "Book updated");
  })
];

export const deleteBook = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE books SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id AND deleted_at IS NULL`,
      { id: req.params.id }
    );
    if (!result.affectedRows) throw new HttpError(404, "Book not found");
    await logActivity({ userId: req.user?.id, action: "book_deleted", entityType: "book", entityId: Number(req.params.id) });
    ok(res, "Book deleted");
  })
];

export const updateCopyStatus = [
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = copyStatusSchema.parse(req.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE book_copies SET status = :status WHERE id = :copyId AND deleted_at IS NULL`,
      { copyId: req.params.copyId, status: payload.status }
    );
    if (!result.affectedRows) throw new HttpError(404, "Book copy not found");
    await logActivity({ userId: req.user?.id, action: "copy_status_updated", entityType: "book_copy", entityId: Number(req.params.copyId), details: payload });
    ok(res, "Book copy status updated");
  })
];
