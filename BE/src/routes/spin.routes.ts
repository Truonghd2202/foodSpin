import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { create, history } from "../controllers/spin.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

const router = Router();
router.use(requireAuth);
router.post("/", asyncHandler(create));
router.get("/history", asyncHandler(history));
export default router;
