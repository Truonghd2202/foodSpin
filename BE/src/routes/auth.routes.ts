import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { authRateLimit } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/refresh", authRateLimit, refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
