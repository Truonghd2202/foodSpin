import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "spin-integration-access-secret-at-least-32-chars";
process.env.JWT_REFRESH_SECRET = "spin-integration-refresh-secret-at-least-32-chars";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/database.js");

type Session = { token: string; userId: string };
async function session(label: string): Promise<Session> {
  const email = `spin-${label}-${Date.now()}-${Math.random()}@example.test`; const password = "TestPassword123!";
  await request(app).post("/api/auth/register").send({ email, password, displayName: label }).expect(201);
  const response = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return { token: response.body.data.accessToken, userId: response.body.data.user.id };
}
const auth = (value: Session) => ({ Authorization: `Bearer ${value.token}` });

describe("authoritative spin API", () => {
  let owner: Session; let other: Session; let categoryId: string; let winnerId: string; let disabledId: string; let inactiveId: string;
  beforeAll(async () => {
    owner = await session("owner"); other = await session("other");
    const category = await prisma.categories.create({ data: { slug: `spin-test-${Date.now()}`, name: "Spin Test" } }); categoryId = category.id;
    const winner = await prisma.foods.create({ data: { owner_id: owner.userId, category_id: categoryId, name: "Eligible winner", image_url: "/test/winner.jpg", vegetarian: true } }); winnerId = winner.id;
    await prisma.food_meal_times.create({ data: { food_id: winnerId, meal_time: "dinner" } });
    const disabled = await prisma.foods.create({ data: { owner_id: owner.userId, category_id: categoryId, name: "Disabled", image_url: "/test/disabled.jpg", vegetarian: true } }); disabledId = disabled.id;
    await prisma.user_food_preferences.create({ data: { user_id: owner.userId, food_id: disabledId, is_enabled: false } });
    const inactive = await prisma.foods.create({ data: { owner_id: owner.userId, category_id: categoryId, name: "Inactive", image_url: "/test/inactive.jpg", is_active: false, vegetarian: true } }); inactiveId = inactive.id;
    await prisma.foods.create({ data: { owner_id: other.userId, category_id: categoryId, name: "Other user's food", image_url: "/test/other.jpg", vegetarian: true } });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({ where: { id: { in: [owner.userId, other.userId] } } });
    await prisma.categories.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("rejects foodId and cleanly rejects an empty pool", async () => {
    await request(app).post("/api/spins").set(auth(owner)).send({ foodId: winnerId, filters: {} }).expect(400);
    const emptyCategory = await prisma.categories.create({ data: { slug: `empty-${Date.now()}`, name: "Empty" } });
    const response = await request(app).post("/api/spins").set(auth(owner)).send({ filters: { categoryId: emptyCategory.id } }).expect(400);
    expect(response.body.code).toBe("NO_ELIGIBLE_FOODS");
    await prisma.categories.delete({ where: { id: emptyCategory.id } });
  });

  it("applies access, active, enabled and selected filters and writes once", async () => {
    const before = await prisma.spin_history.count({ where: { user_id: owner.userId } });
    const response = await request(app).post("/api/spins").set(auth(owner)).send({ filters: { categoryId, mealTime: "dinner", vegetarian: true } }).expect(201);
    expect(response.body.data.winner.id).toBe(winnerId);
    expect([disabledId, inactiveId]).not.toContain(response.body.data.winner.id);
    expect(await prisma.spin_history.count({ where: { user_id: owner.userId } })).toBe(before + 1);
  });

  it("keeps snapshot history after food deletion and isolates users", async () => {
    await request(app).post("/api/spins").set(auth(owner)).send({ filters: { categoryId } }).expect(201);
    await prisma.foods.delete({ where: { id: winnerId } });
    const history = await request(app).get("/api/spins/history?page=1&limit=1").set(auth(owner)).expect(200);
    expect(history.body.data.items[0].food.name).toBe("Eligible winner");
    expect(history.body.data.items[0].food.isDeleted).toBe(true);
    const otherHistory = await request(app).get("/api/spins/history").set(auth(other)).expect(200);
    expect(otherHistory.body.data.total).toBe(0);
    expect(history.body.data.limit).toBe(1);
    expect(history.body.data.hasMore).toBe(true);
  });
});
