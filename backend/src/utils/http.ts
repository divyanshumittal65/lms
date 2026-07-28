import type { Response } from "express";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export function ok<T>(res: Response, message: string, data?: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}
