export type User = { id: string; email: string; displayName: string | null; avatarUrl: string | null; createdAt: string };
export type Category = { id: string; slug: string; name: string };
export type MealTime = "breakfast" | "lunch" | "dinner" | "late-night";
export type Food = {
  id: string; name: string; imageUrl: string; description: string | null; spicy: boolean;
  vegetarian: boolean; category: Category | null; mealTimes: MealTime[]; isCustom: boolean;
  isEnabled: boolean; isFavorite: boolean; createdAt: string;
};
export type FoodInput = { name: string; description?: string; categoryId?: string | null; mealTimes: MealTime[]; spicy: boolean; vegetarian: boolean };
export type SpinFilters = { categoryId?: string; mealTime?: MealTime; spicy?: boolean; vegetarian?: boolean };
export type SpinHistoryItem = { id: string; food: Food; filters: SpinFilters; spunAt: string };
export type HistoryPage = { items: SpinHistoryItem[]; page: number; limit: number; total: number; hasMore: boolean };
export type SpinResult = { spinId: string; winner: Food; filters: SpinFilters; spunAt: string };
export type AuthSession = { user: User; accessToken: string };
