import type { Request, Response } from "express";

import {
  createFoodSchema,
  enabledSchema,
  foodIdSchema,
  preferenceSchema,
  updateFoodSchema,
} from "../schemas/food.schema.js";
import {
  createFood,
  deleteFood,
  findAccessibleFood,
  listFavoriteFoods,
  listAccessibleFoods,
  listEnabledFoods,
  listFoodsByOwner,
  normalizeFood,
  setEnabled,
  setFavorite,
  updateFood,
} from "../services/food.service.js";

function userId(req: Request) {
  return req.userId as string;
}

function parseId(req: Request, res: Response) {
  const parsed = foodIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid food id" });
    return null;
  }
  return parsed.data.id;
}

export async function create(req: Request, res: Response) {
  const parsed = createFoodSchema.safeParse(req.body);
  if (!parsed.success || !req.file) {
    return res.status(400).json({
      success: false,
      message: !req.file ? "Image is required" : "Invalid food data",
      ...(parsed.success ? {} : { errors: parsed.error.flatten() }),
    });
  }

  try {
    return res.status(201).json({
      success: true,
      data: await createFood(userId(req), parsed.data, req.file),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Cloudinary configuration is required for image uploads") {
      return res.status(503).json({ success: false, message: "Image upload is not configured" });
    }
    if (error instanceof Error && error.message === "IMAGE_UPLOAD_FAILED") {
      return res.status(502).json({ success: false, message: "Image upload failed" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Unable to create food" });
  }
}

export async function custom(req: Request, res: Response) {
  return res.json({ success: true, data: await listFoodsByOwner(userId(req)) });
}

export async function list(req: Request, res: Response) {
  return res.json({ success: true, data: await listAccessibleFoods(userId(req)) });
}

export async function enabledList(req: Request, res: Response) {
  return res.json({ success: true, data: await listEnabledFoods(userId(req)) });
}

export async function detail(req: Request, res: Response) {
  const id = parseId(req, res);
  if (!id) return;

  const food = await findAccessibleFood(id, userId(req));
  if (!food) return res.status(404).json({ success: false, message: "Food not found" });
  return res.json({ success: true, data: normalizeFood(food, userId(req)) });
}

export async function update(req: Request, res: Response) {
  const id = parseId(req, res);
  if (!id) return;

  const food = await findAccessibleFood(id, userId(req));
  if (!food) return res.status(404).json({ success: false, message: "Food not found" });
  if (food.owner_id !== userId(req)) {
    return res.status(403).json({ success: false, message: "System foods cannot be edited" });
  }

  const parsed = updateFoodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid food data", errors: parsed.error.flatten() });
  }

  try {
    return res.json({
      success: true,
      data: await updateFood(id, userId(req), parsed.data, req.file),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Unable to update food" });
  }
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req, res);
  if (!id) return;

  const food = await findAccessibleFood(id, userId(req));
  if (!food) return res.status(404).json({ success: false, message: "Food not found" });
  if (food.owner_id !== userId(req)) {
    return res.status(403).json({ success: false, message: "System foods cannot be deleted" });
  }

  await deleteFood(id);
  return res.json({ success: true, data: { deleted: true, foodId: id } });
}

export async function favorite(req: Request, res: Response) {
  const id = parseId(req, res);
  if (!id) return;
  const parsed = preferenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "isFavorite must be a boolean" });
  if (!(await findAccessibleFood(id, userId(req)))) {
    return res.status(404).json({ success: false, message: "Food not found" });
  }
  return res.json({ success: true, data: await setFavorite(id, userId(req), parsed.data.isFavorite) });
}

export async function enabled(req: Request, res: Response) {
  const id = parseId(req, res);
  if (!id) return;
  const parsed = enabledSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "isEnabled must be a boolean" });
  if (!(await findAccessibleFood(id, userId(req)))) {
    return res.status(404).json({ success: false, message: "Food not found" });
  }
  return res.json({ success: true, data: await setEnabled(id, userId(req), parsed.data.isEnabled) });
}

export async function favorites(req: Request, res: Response) {
  return res.json({ success: true, data: await listFavoriteFoods(userId(req)) });
}
