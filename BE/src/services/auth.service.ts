import {
  createUser,
  findUserByEmail,
  findUserById,
} from "../repositories/user.repository.js";

import { comparePassword, hashPassword } from "../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

type RegisterInput = {
  email: string;
  password: string;
  displayName?: string;
};

export async function registerUser(input: RegisterInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
    displayName: input.displayName?.trim(),
  });

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at,
  };
}

type LoginInput = {
  email: string;
  password: string;
};

function toSafeUser(user: {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export async function loginUser(input: LoginInput) {
  const user = await findUserByEmail(input.email.trim().toLowerCase());

  if (!user || !(await comparePassword(input.password, user.password_hash))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return {
    user: toSafeUser(user),
    accessToken: generateAccessToken(user.id),
    refreshToken: generateRefreshToken(user.id),
  };
}

export async function refreshUserSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await findUserById(payload.sub);

  if (!user) {
    throw new Error("INVALID_TOKEN");
  }

  return {
    user: toSafeUser(user),
    accessToken: generateAccessToken(user.id),
    refreshToken: generateRefreshToken(user.id),
  };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return toSafeUser(user);
}
