import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSchema() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true
  });
  await connection.query(schema);
  await connection.end();
}

async function seed() {
  await runSchema();

  const adminHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ('Library Admin', :email, :passwordHash, 'admin', 'active')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'active', deleted_at = NULL`,
    { email: env.ADMIN_EMAIL, passwordHash: adminHash }
  );

  await pool.execute(
    `INSERT INTO settings (setting_key, setting_value)
     VALUES ('borrow_duration_days', '14')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );

  const categories = [
    ["Computer Science", "Programming, systems, and software engineering"],
    ["Fiction", "Novels and literary works"],
    ["Science", "Physics, biology, chemistry, and general science"],
    ["Business", "Management, finance, and entrepreneurship"]
  ];
  for (const [name, description] of categories) {
    await pool.execute(
      `INSERT INTO categories (name, description)
       VALUES (:name, :description)
       ON DUPLICATE KEY UPDATE description = VALUES(description), deleted_at = NULL`,
      { name, description }
    );
  }

  const authors = ["Robert C. Martin", "J. K. Rowling", "Stephen Hawking", "Eric Ries"];
  for (const name of authors) {
    await pool.execute(
      `INSERT INTO authors (name)
       VALUES (:name)
       ON DUPLICATE KEY UPDATE deleted_at = NULL`,
      { name }
    );
  }

  const [categoryRows] = await pool.execute<any[]>(`SELECT id, name FROM categories`);
  const [authorRows] = await pool.execute<any[]>(`SELECT id, name FROM authors`);
  const categoryId = (name: string) => categoryRows.find((row) => row.name === name).id;
  const authorId = (name: string) => authorRows.find((row) => row.name === name).id;

  const books = [
    {
      title: "Clean Code",
      isbn: "9780132350884",
      authorId: authorId("Robert C. Martin"),
      categoryId: categoryId("Computer Science"),
      publisher: "Prentice Hall",
      publishedYear: 2008,
      description: "Practical guidance for writing maintainable software.",
      copies: 3
    },
    {
      title: "Harry Potter and the Philosopher's Stone",
      isbn: "9780747532699",
      authorId: authorId("J. K. Rowling"),
      categoryId: categoryId("Fiction"),
      publisher: "Bloomsbury",
      publishedYear: 1997,
      description: "A young wizard begins his journey at Hogwarts.",
      copies: 2
    },
    {
      title: "A Brief History of Time",
      isbn: "9780553380163",
      authorId: authorId("Stephen Hawking"),
      categoryId: categoryId("Science"),
      publisher: "Bantam",
      publishedYear: 1988,
      description: "Cosmology and the universe explained for general readers.",
      copies: 2
    },
    {
      title: "The Lean Startup",
      isbn: "9780307887894",
      authorId: authorId("Eric Ries"),
      categoryId: categoryId("Business"),
      publisher: "Crown Business",
      publishedYear: 2011,
      description: "A method for building startups through validated learning.",
      copies: 2
    }
  ];

  for (const book of books) {
    await pool.execute(
      `INSERT INTO books (title, isbn, author_id, category_id, publisher, published_year, description)
       VALUES (:title, :isbn, :authorId, :categoryId, :publisher, :publishedYear, :description)
       ON DUPLICATE KEY UPDATE title = VALUES(title), author_id = VALUES(author_id),
         category_id = VALUES(category_id), publisher = VALUES(publisher),
         published_year = VALUES(published_year), description = VALUES(description), deleted_at = NULL`,
      book
    );

    const [bookRows] = await pool.execute<any[]>(`SELECT id FROM books WHERE isbn = :isbn LIMIT 1`, {
      isbn: book.isbn
    });
    for (let index = 1; index <= book.copies; index += 1) {
      await pool.execute(
        `INSERT INTO book_copies (book_id, accession_no, status)
         VALUES (:bookId, :accessionNo, 'available')
         ON DUPLICATE KEY UPDATE deleted_at = NULL`,
        { bookId: bookRows[0].id, accessionNo: `${book.isbn}-${String(index).padStart(3, "0")}` }
      );
    }
  }

  console.log("Database seeded successfully");
  console.log(`Admin login: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
  await pool.end();
}

seed().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
