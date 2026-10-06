import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { list } from "../controllers/category.controller.js";

const router = Router();
router.get("/", requireAuth, list);

export default router;
