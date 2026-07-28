import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";
import { loginSchema, registerSchema } from "../validators/auth.schema.js";
import { asyncHandler } from "../utils/async.js";
import { HttpError, ok } from "../utils/http.js";
import { logActivity } from "../utils/activity.js";

type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "student";
  status: "active" | "blocked";
};

function signToken(user: Pick<UserRow, "id" | "email" | "role">) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    ...options
  });
}

export const register = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(payload.password, 12);

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES (:name, :email, :passwordHash, 'student', :phone)`,
    { ...payload, passwordHash, phone: payload.phone ?? null }
  );

  await logActivity({
    userId: result.insertId,
    action: "student_registered",
    entityType: "user",
    entityId: result.insertId
  });

  ok(
    res,
    "Registration successful",
    {
      token: signToken({ id: result.insertId, email: payload.email, role: "student" }),
      user: { id: result.insertId, name: payload.name, email: payload.email, role: "student" }
    },
    201
  );
});

export const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT * FROM users WHERE email = :email AND role = :role AND deleted_at IS NULL LIMIT 1`,
    payload
  );
  const user = rows[0];

  if (!user || !(await bcrypt.compare(payload.password, user.password_hash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.status !== "active") {
    throw new HttpError(403, "Your account is blocked");
  }

  await logActivity({
    userId: user.id,
    action: "login",
    entityType: "user",
    entityId: user.id,
    details: { role: user.role }
  });

  ok(res, "Login successful", {
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

export const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email, role, status, phone, created_at FROM users
     WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
    { id: req.user?.id ?? 0 }
  );

  if (!rows[0]) {
    throw new HttpError(404, "User not found");
  }

  ok(res, "Current user fetched", rows[0]);
});
