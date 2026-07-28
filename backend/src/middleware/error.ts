import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http.js";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.flatten()
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};
