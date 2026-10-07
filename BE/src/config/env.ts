import "dotenv/config";

const requiredVariables = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
] as const;

for (const variable of requiredVariables) {
  const value = process.env[variable];

  if (!value || value.includes("change_me")) {
    throw new Error(`${variable} must be configured before starting the server`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  refreshCookieName: "foodspin_refresh",
};
