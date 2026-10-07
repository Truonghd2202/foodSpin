import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors/app-error.js";
import { createSpinSchema, historyQuerySchema } from "../src/schemas/spin.schema.js";
import { selectWinner } from "../src/services/spin-selector.js";

describe("spin contracts", () => {
  it("selects exactly one server-side winner", () => {
    expect(selectWinner(["a", "b", "c"], () => 0)).toBe("a");
    expect(selectWinner(["a", "b", "c"], () => 0.999)).toBe("c");
    expect(() => selectWinner([])).toThrowError(AppError);
  });

  it("rejects a client-provided foodId", () => {
    expect(createSpinSchema.safeParse({ foodId: "11111111-1111-4111-8111-111111111111", filters: {} }).success).toBe(false);
    expect(createSpinSchema.safeParse({ filters: { mealTime: "dinner", vegetarian: false } }).success).toBe(true);
  });

  it("validates history pagination", () => {
    expect(historyQuerySchema.parse({ page: "2", limit: "20" })).toEqual({ page: 2, limit: 20 });
    expect(historyQuerySchema.safeParse({ page: 0, limit: 100 }).success).toBe(false);
  });
});
