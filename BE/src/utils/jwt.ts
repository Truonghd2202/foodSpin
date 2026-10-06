import jwt, { type SignOptions } from "jsonwebtoken";

type TokenType = "access" | "refresh";

export type AuthTokenPayload = {
  sub: string;
  type: TokenType;
};

function getSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const secret = process.env[name];

  if (!secret || secret.length < 32 || secret.includes("change_me")) {
    throw new Error(`${name} must be configured with a secure value`);
  }

  return secret;
}

function getExpiresIn(name: "JWT_ACCESS_EXPIRES_IN" | "JWT_REFRESH_EXPIRES_IN") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be configured`);
  }

  return value as SignOptions["expiresIn"];
}

function signToken(userId: string, type: TokenType) {
  const isAccessToken = type === "access";
  const secret = getSecret(isAccessToken ? "JWT_ACCESS_SECRET" : "JWT_REFRESH_SECRET");
  const expiresIn = getExpiresIn(
    isAccessToken ? "JWT_ACCESS_EXPIRES_IN" : "JWT_REFRESH_EXPIRES_IN",
  );

  return jwt.sign({ sub: userId, type }, secret, { expiresIn });
}

function verifyToken(token: string, type: TokenType): AuthTokenPayload {
  const secret = getSecret(type === "access" ? "JWT_ACCESS_SECRET" : "JWT_REFRESH_SECRET");
  const payload = jwt.verify(token, secret);

  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    payload.type !== type
  ) {
    throw new Error("INVALID_TOKEN");
  }

  return {
    sub: payload.sub,
    type,
  };
}

export function generateAccessToken(userId: string) {
  return signToken(userId, "access");
}

export function generateRefreshToken(userId: string) {
  return signToken(userId, "refresh");
}

export function verifyAccessToken(token: string) {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string) {
  return verifyToken(token, "refresh");
}