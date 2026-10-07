import { z } from "zod";

export const spinFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  mealTime: z.enum(["breakfast", "lunch", "dinner", "late-night"]).optional(),
  spicy: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
}).strict();

export const createSpinSchema = z.object({ filters: spinFiltersSchema.optional().default({}) }).strict();

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
