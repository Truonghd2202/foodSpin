import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { createSpinSchema, historyQuerySchema } from "../schemas/spin.schema.js";
import { createSpin, listSpinHistory } from "../services/spin.service.js";

export async function create(req: Request, res: Response) {
  const parsed = createSpinSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "INVALID_SPIN_DATA", "Invalid spin data", parsed.error.flatten());
  return res.status(201).json({ success: true, data: await createSpin(req.userId as string, parsed.data.filters) });
}

export async function history(req: Request, res: Response) {
  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, "INVALID_PAGINATION", "Invalid pagination", parsed.error.flatten());
  return res.json({ success: true, data: await listSpinHistory(req.userId as string, parsed.data.page, parsed.data.limit) });
}
