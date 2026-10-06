import { z } from "zod";

export const mealTimeSchema = z.enum(["breakfast", "lunch", "dinner", "late-night"]);

const booleanFormValue = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

const mealTimesFormValue = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return value;
}, z.array(mealTimeSchema).max(4).optional());

export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(150),
  categoryId: z.string().uuid().optional(),
  mealTimes: mealTimesFormValue,
  description: z.string().trim().max(1000).optional(),
  spicy: booleanFormValue.optional().default(false),
  vegetarian: booleanFormValue.optional().default(false),
});

export const updateFoodSchema = createFoodSchema.partial();

export const foodIdSchema = z.object({ id: z.string().uuid() });

export const preferenceSchema = z.object({
  isFavorite: z.boolean(),
});

export const enabledSchema = z.object({
  isEnabled: z.boolean(),
});
