import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../errors/app-error.js";

export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ success: false, code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) });
    return;
  }
  if (error instanceof Error && error.message === "CORS_ORIGIN_REJECTED") {
    res.status(403).json({ success: false, code: "CORS_ORIGIN_REJECTED", message: "Origin is not allowed" });
    return;
  }
  console.error("Unhandled request error", error);
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal server error" });
};
