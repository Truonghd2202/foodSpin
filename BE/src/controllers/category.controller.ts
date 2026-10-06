import type { Request, Response } from "express";

import prisma from "../config/database.js";

export async function list(_req: Request, res: Response) {
  const categories = await prisma.categories.findMany({ orderBy: { name: "asc" } });
  return res.json({ success: true, data: categories });
}
