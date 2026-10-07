import { AppError } from "../errors/app-error.js";

export function selectWinner<T>(foods: readonly T[], random: () => number = Math.random): T {
  if (foods.length === 0) throw new AppError(400, "NO_ELIGIBLE_FOODS", "No eligible foods for this spin");
  return foods[Math.min(foods.length - 1, Math.floor(random() * foods.length))]!;
}
