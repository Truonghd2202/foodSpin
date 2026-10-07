import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "auth-security-access-secret-at-least-32-chars";
process.env.JWT_REFRESH_SECRET = "auth-security-refresh-secret-at-least-32-chars";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/database.js");
const email = `auth-security-${Date.now()}@example.test`;
const password = "TestPassword123!";

describe("web authentication security", () => {
  afterAll(async () => {
    await prisma.users.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("keeps refresh token in an HttpOnly cookie and rotates it", async () => {
    await request(app).post("/api/auth/register").send({ email, password, displayName: "Security" }).expect(201);
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email, password }).expect(200);
    expect(login.body.data.accessToken).toBeTypeOf("string");
    expect(login.body.data.refreshToken).toBeUndefined();
    expect(login.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    const refreshed = await agent.post("/api/auth/refresh").send({}).expect(200);
    expect(refreshed.body.data.accessToken).toBeTypeOf("string");
    await request(app).post("/api/auth/refresh").send({}).expect(401);
  });

  it("rejects invalid credentials without exposing details", async () => {
    const response = await request(app).post("/api/auth/login").send({ email, password: "wrong-password" }).expect(401);
    expect(response.body.message).toBe("Invalid email or password");
    expect(JSON.stringify(response.body)).not.toContain("password_hash");
  });

  it("rejects an unapproved browser origin", async () => {
    await request(app).get("/api/health").set("Origin", "https://attacker.example").expect(403);
  });
});
