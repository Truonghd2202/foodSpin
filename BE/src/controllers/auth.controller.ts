import type { Request, Response } from "express";

import { loginSchema, refreshSchema, registerSchema } from "../schemas/auth.schema.js";
import {
  getCurrentUser,
  loginUser,
  refreshUserSession,
  registerUser,
} from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration data",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const user = await registerUser(parsed.data);
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid login data",
      errors: parsed.error.flatten(),
    });
  }

  try {
    return res.json({ success: true, data: await loginUser(parsed.data) });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function refresh(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Refresh token is required" });
  }

  try {
    return res.json({ success: true, data: await refreshUserSession(parsed.data.refreshToken) });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
}

export function logout(_req: Request, res: Response) {
  return res.json({ success: true, data: { loggedOut: true } });
}

export async function me(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    return res.json({ success: true, data: await getCurrentUser(req.userId) });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
