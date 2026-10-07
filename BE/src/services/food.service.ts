import prisma from "../config/database.js";
import { deleteImage, uploadImage } from "./upload.service.js";

const foodInclude = {
  categories: true,
  food_meal_times: { orderBy: { meal_time: "asc" as const } },
  user_food_preferences: true,
};

type FoodWithRelations = Awaited<ReturnType<typeof findFoodById>>;

function mapFood(food: NonNullable<FoodWithRelations>, userId: string) {
  const preference = food.user_food_preferences.find((item) => item.user_id === userId);

  return {
    id: food.id,
    name: food.name,
    imageUrl: food.image_url,
    description: food.description,
    spicy: food.spicy,
    vegetarian: food.vegetarian,
    category: food.categories
      ? { id: food.categories.id, slug: food.categories.slug, name: food.categories.name }
      : null,
    mealTimes: food.food_meal_times.map((item) => item.meal_time),
    isCustom: food.owner_id !== null,
    isEnabled: preference?.is_enabled ?? true,
    isFavorite: preference?.is_favorite ?? false,
    createdAt: food.created_at,
  };
}

export async function findFoodById(id: string) {
  return prisma.foods.findUnique({ where: { id }, include: foodInclude });
}

export async function findAccessibleFood(id: string, userId: string) {
  const food = await findFoodById(id);
  if (!food || (food.owner_id !== null && food.owner_id !== userId)) return null;
  return food;
}

export function normalizeFood(food: NonNullable<FoodWithRelations>, userId: string) {
  return mapFood(food, userId);
}

export async function listFoodsByOwner(userId: string) {
  const foods = await prisma.foods.findMany({
    where: { owner_id: userId },
    include: foodInclude,
    orderBy: { created_at: "desc" },
  });
  return foods.map((food) => mapFood(food, userId));
}

export async function listAccessibleFoods(userId: string) {
  const foods = await prisma.foods.findMany({
    where: { is_active: true, OR: [{ owner_id: null }, { owner_id: userId }] },
    include: foodInclude,
    orderBy: { name: "asc" },
  });
  return foods.map((food) => mapFood(food, userId));
}

export async function listEnabledFoods(userId: string) {
  const foods = await prisma.foods.findMany({
    where: {
      is_active: true,
      OR: [{ owner_id: null }, { owner_id: userId }],
      NOT: {
        user_food_preferences: { some: { user_id: userId, is_enabled: false } },
      },
    },
    include: foodInclude,
    orderBy: { name: "asc" },
  });
  return foods.map((food) => mapFood(food, userId));
}

export async function listFavoriteFoods(userId: string) {
  const foods = await prisma.foods.findMany({
    where: {
      is_active: true,
      OR: [{ owner_id: null }, { owner_id: userId }],
      user_food_preferences: { some: { user_id: userId, is_favorite: true } },
    },
    include: foodInclude,
    orderBy: { name: "asc" },
  });
  return foods.map((food) => mapFood(food, userId));
}

export async function createFood(
  userId: string,
  input: {
    name: string;
    categoryId?: string;
    mealTimes?: string[];
    description?: string;
    spicy: boolean;
    vegetarian: boolean;
  },
  file: Express.Multer.File,
) {
  const image = await uploadImage(file.buffer, file.mimetype);
  let food;
  try {
    food = await prisma.$transaction(async (transaction) => {
      const created = await transaction.foods.create({
      data: {
        owner_id: userId,
        category_id: input.categoryId ?? null,
        name: input.name,
        image_url: image.secureUrl,
        image_public_id: image.publicId,
        description: input.description ?? null,
        spicy: input.spicy,
        vegetarian: input.vegetarian,
      },
    });

      if (input.mealTimes?.length) {
        await transaction.food_meal_times.createMany({
          data: input.mealTimes.map((mealTime) => ({ food_id: created.id, meal_time: mealTime })),
          skipDuplicates: true,
        });
      }

      return transaction.foods.findUniqueOrThrow({ where: { id: created.id }, include: foodInclude });
    });
  } catch (error) {
    void deleteImage(image.publicId).catch((cleanupError) => console.error("Cloudinary create rollback cleanup failed", { cleanupError }));
    throw error;
  }

  return mapFood(food, userId);
}

export async function updateFood(
  foodId: string,
  userId: string,
  input: {
    name?: string;
    categoryId?: string | null;
    mealTimes?: string[];
    description?: string;
    spicy?: boolean;
    vegetarian?: boolean;
  },
  file?: Express.Multer.File,
) {
  const existing = await findAccessibleFood(foodId, userId);
  if (!existing || existing.owner_id !== userId) throw new Error("FOOD_NOT_FOUND");
  const image = file ? await uploadImage(file.buffer, file.mimetype) : undefined;
  let food;
  try {
    food = await prisma.$transaction(async (transaction) => {
      await transaction.foods.update({
      where: { id: foodId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.categoryId !== undefined && { category_id: input.categoryId }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.spicy !== undefined && { spicy: input.spicy }),
        ...(input.vegetarian !== undefined && { vegetarian: input.vegetarian }),
        ...(image && { image_url: image.secureUrl, image_public_id: image.publicId }),
        updated_at: new Date(),
      },
    });

      if (input.mealTimes !== undefined) {
        await transaction.food_meal_times.deleteMany({ where: { food_id: foodId } });
        await transaction.food_meal_times.createMany({
          data: input.mealTimes.map((mealTime) => ({ food_id: foodId, meal_time: mealTime })),
          skipDuplicates: true,
        });
      }

      return transaction.foods.findUniqueOrThrow({ where: { id: foodId }, include: foodInclude });
    });
  } catch (error) {
    if (image) void deleteImage(image.publicId).catch((cleanupError) => console.error("Cloudinary update rollback cleanup failed", { foodId, cleanupError }));
    throw error;
  }

  if (image && existing.image_public_id) {
    void deleteImage(existing.image_public_id).catch((error) => console.error("Cloudinary replacement cleanup failed", { foodId, error }));
  }

  return mapFood(food, userId);
}

export async function deleteFood(foodId: string, imagePublicId?: string | null) {
  await prisma.foods.delete({ where: { id: foodId } });
  if (imagePublicId) {
    void deleteImage(imagePublicId).catch((error) => console.error("Cloudinary deletion cleanup failed", { foodId, error }));
  }
}

export async function setFavorite(foodId: string, userId: string, isFavorite: boolean) {
  await prisma.user_food_preferences.upsert({
    where: { user_id_food_id: { user_id: userId, food_id: foodId } },
    create: { user_id: userId, food_id: foodId, is_favorite: isFavorite },
    update: { is_favorite: isFavorite, updated_at: new Date() },
  });
  return { foodId, isFavorite };
}

export async function setEnabled(foodId: string, userId: string, isEnabled: boolean) {
  await prisma.user_food_preferences.upsert({
    where: { user_id_food_id: { user_id: userId, food_id: foodId } },
    create: { user_id: userId, food_id: foodId, is_enabled: isEnabled },
    update: { is_enabled: isEnabled, updated_at: new Date() },
  });
  return { foodId, isEnabled };
}
