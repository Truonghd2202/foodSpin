import type { MealTime } from "./types";

export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  breakfast: "Bữa sáng",
  lunch: "Bữa trưa",
  dinner: "Bữa tối",
  "late-night": "Ăn khuya",
};

export const MEAL_TIMES = Object.entries(MEAL_TIME_LABELS) as [MealTime, string][];
