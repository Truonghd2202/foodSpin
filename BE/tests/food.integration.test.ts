import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "integration-access-secret-with-at-least-32-chars";
process.env.JWT_REFRESH_SECRET = "integration-refresh-secret-with-at-least-32-chars";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

const uploadMocks = vi.hoisted(() => ({ deleteImage: vi.fn(async () => undefined) }));

vi.mock("../src/services/upload.service.js", () => ({
  uploadImage: vi.fn(async () => ({
    secureUrl: "https://example.test/food.jpg",
    publicId: "foodspin/test-image",
  })),
  deleteImage: uploadMocks.deleteImage,
}));

const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/database.js");

type Session = { token: string; userId: string };

async function createSession(label: string): Promise<Session> {
  const email = `food-test-${label}-${Date.now()}-${Math.random()}@example.test`;
  const password = "TestPassword123!";
  await request(app).post("/api/auth/register").send({
    email,
    password,
    displayName: label,
  }).expect(201);
  const response = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return {
    token: response.body.data.accessToken as string,
    userId: response.body.data.user.id as string,
  };
}

function auth(session: Session) {
  return { Authorization: `Bearer ${session.token}` };
}

describe("custom food API", () => {
  let owner: Session;
  let otherUser: Session;
  let categoryId: string;
  let systemFoodId: string;
  let customFoodId: string;

  beforeAll(async () => {
    owner = await createSession("owner");
    otherUser = await createSession("other");
    const category = await prisma.categories.findFirstOrThrow();
    categoryId = category.id;
    const systemFood = await prisma.foods.create({
      data: {
        name: `System test food ${Date.now()}`,
        image_url: "https://example.test/system.jpg",
        category_id: categoryId,
      },
    });
    systemFoodId = systemFood.id;
  });

  afterAll(async () => {
    await prisma.users.deleteMany({
      where: { id: { in: [owner.userId, otherUser.userId] } },
    });
    await prisma.foods.delete({ where: { id: systemFoodId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("requires authentication and image for creation", async () => {
    await request(app).post("/api/foods").field("name", "No auth").expect(401);
    await request(app).post("/api/foods").set(auth(owner)).field("name", "No image").expect(400);
    await request(app)
      .post("/api/foods")
      .set(auth(owner))
      .attach("image", Buffer.from("fake-image"), "food.txt")
      .expect(400);
    await request(app)
      .post("/api/foods")
      .set(auth(owner))
      .attach("image", Buffer.from("fake-image"), "food.jpg")
      .expect(400);
    await request(app)
      .post("/api/foods")
      .set(auth(owner))
      .field("name", "Too large")
      .attach("image", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "large.jpg", contentType: "image/jpeg" })
      .expect(400);
  });

  it("creates a custom food and ignores spoofed owner_id", async () => {
    const response = await request(app)
      .post("/api/foods")
      .set(auth(owner))
      .field("name", "Test custom food")
      .field("categoryId", categoryId)
      .field("mealTimes", "lunch")
      .field("mealTimes", "dinner")
      .field("mealTimes", "dinner")
      .field("owner_id", otherUser.userId)
      .attach("image", Buffer.from("fake-image"), "food.jpg")
      .expect(201);

    customFoodId = response.body.data.id as string;
    const stored = await prisma.foods.findUniqueOrThrow({ where: { id: customFoodId } });
    expect(stored.owner_id).toBe(owner.userId);
    expect(stored.image_public_id).toBe("foodspin/test-image");
    expect(response.body.data.mealTimes).toEqual(["dinner", "lunch"]);
    expect(new Set(response.body.data.mealTimes).size).toBe(2);
  });

  it("hides another user's custom food and exposes system food", async () => {
    await request(app).get(`/api/foods/${customFoodId}`).set(auth(otherUser)).expect(404);
    await request(app).get(`/api/foods/${systemFoodId}`).set(auth(otherUser)).expect(200);
  });

  it("edits own food, replaces meal times, and rejects system edits", async () => {
    const response = await request(app)
      .patch(`/api/foods/${customFoodId}`)
      .set(auth(owner))
      .field("name", "Updated custom food")
      .field("mealTimes", "breakfast")
      .expect(200);
    expect(response.body.data.mealTimes).toEqual(["breakfast"]);
    expect(response.body.data.name).toBe("Updated custom food");
    const cleared = await request(app)
      .patch(`/api/foods/${customFoodId}`)
      .set(auth(owner))
      .field("categoryId", "")
      .expect(200);
    expect(cleared.body.data.category).toBeNull();
    await request(app)
      .patch(`/api/foods/${customFoodId}`)
      .set(auth(owner))
      .field("name", "Updated custom food")
      .attach("image", Buffer.from("replacement"), { filename: "replacement.jpg", contentType: "image/jpeg" })
      .expect(200);
    expect(uploadMocks.deleteImage).toHaveBeenCalledWith("foodspin/test-image");
    await request(app).patch(`/api/foods/${systemFoodId}`).set(auth(owner)).field("name", "Nope").expect(403);
    await request(app).patch(`/api/foods/${customFoodId}`).set(auth(otherUser)).field("name", "Nope").expect(404);
  });

  it("toggles favorite and enabled preferences", async () => {
    await request(app).patch(`/api/foods/${systemFoodId}/favorite`).set(auth(owner)).send({ isFavorite: true }).expect(200);
    const favorites = await request(app).get("/api/foods/favorites").set(auth(owner)).expect(200);
    expect(favorites.body.data.some((food: { id: string }) => food.id === systemFoodId)).toBe(true);

    await request(app).patch(`/api/foods/${systemFoodId}/enabled`).set(auth(owner)).send({ isEnabled: false }).expect(200);
    const enabled = await request(app).get("/api/foods/enabled").set(auth(owner)).expect(200);
    expect(enabled.body.data.some((food: { id: string }) => food.id === systemFoodId)).toBe(false);

    await request(app).patch(`/api/foods/${systemFoodId}/enabled`).set(auth(owner)).send({ isEnabled: true }).expect(200);
    await request(app).patch(`/api/foods/${systemFoodId}/favorite`).set(auth(owner)).send({ isFavorite: false }).expect(200);
    const unfavorited = await request(app).get("/api/foods/favorites").set(auth(owner)).expect(200);
    expect(unfavorited.body.data.some((food: { id: string }) => food.id === systemFoodId)).toBe(false);
  });

  it("does not expose password hashes and deletes only owned food", async () => {
    const me = await request(app).get("/api/auth/me").set(auth(owner)).expect(200);
    expect(JSON.stringify(me.body)).not.toContain("password_hash");
    await request(app).delete(`/api/foods/${customFoodId}`).set(auth(otherUser)).expect(404);
    await request(app).delete(`/api/foods/${systemFoodId}`).set(auth(owner)).expect(403);
    await request(app).delete(`/api/foods/${customFoodId}`).set(auth(owner)).expect(200);
  });
});
