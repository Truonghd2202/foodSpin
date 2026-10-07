import prisma from "../config/database.js";
import { normalizeFood } from "./food.service.js";
import { selectWinner } from "./spin-selector.js";

export type SpinFilters = {
  categoryId?: string;
  mealTime?: "breakfast" | "lunch" | "dinner" | "late-night";
  spicy?: boolean;
  vegetarian?: boolean;
};

const historyFoodInclude = {
  categories: true,
  food_meal_times: { orderBy: { meal_time: "asc" as const } },
  user_food_preferences: true,
};

export async function createSpin(userId: string, filters: SpinFilters) {
  const foods = await prisma.foods.findMany({
    where: {
      is_active: true,
      OR: [{ owner_id: null }, { owner_id: userId }],
      NOT: { user_food_preferences: { some: { user_id: userId, is_enabled: false } } },
      ...(filters.categoryId !== undefined && { category_id: filters.categoryId }),
      ...(filters.spicy !== undefined && { spicy: filters.spicy }),
      ...(filters.vegetarian !== undefined && { vegetarian: filters.vegetarian }),
      ...(filters.mealTime !== undefined && { food_meal_times: { some: { meal_time: filters.mealTime } } }),
    },
    include: historyFoodInclude,
  });

  const winner = selectWinner(foods);
  const history = await prisma.spin_history.create({
    data: {
      user_id: userId,
      food_id: winner.id,
      food_name: winner.name,
      food_image_url: winner.image_url,
      food_category_name: winner.categories?.name ?? null,
      filters,
    },
  });

  return { spinId: history.id, winner: normalizeFood(winner, userId), filters, spunAt: history.spun_at };
}

export async function listSpinHistory(userId: string, page: number, limit: number) {
  const where = { user_id: userId };
  const [history, total] = await prisma.$transaction([
    prisma.spin_history.findMany({
      where,
      include: { foods: { include: historyFoodInclude } },
      orderBy: { spun_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.spin_history.count({ where }),
  ]);

  const items = history.map((item) => {
    const current = item.foods ? normalizeFood(item.foods, userId) : null;
    return {
      id: item.id,
      food: {
        id: item.food_id ?? `deleted:${item.id}`,
        name: item.food_name,
        imageUrl: item.food_image_url,
        description: current?.description ?? null,
        spicy: current?.spicy ?? false,
        vegetarian: current?.vegetarian ?? false,
        category: item.food_category_name ? { id: current?.category?.id ?? "snapshot", slug: current?.category?.slug ?? "snapshot", name: item.food_category_name } : null,
        mealTimes: current?.mealTimes ?? [],
        isCustom: current?.isCustom ?? true,
        isEnabled: current?.isEnabled ?? false,
        isFavorite: current?.isFavorite ?? false,
        createdAt: current?.createdAt ?? item.spun_at,
        isDeleted: !current,
      },
      filters: item.filters,
      spunAt: item.spun_at,
    };
  });

  return { items, page, limit, total, hasMore: page * limit < total };
}
