import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { parseFoodImage } from "../middleware/upload.middleware.js";
import {
  create,
  custom,
  detail,
  enabledList,
  enabled,
  favorite,
  list,
  favorites,
  remove,
  update,
} from "../controllers/food.controller.js";

const router = Router();
router.use(requireAuth);
router.post("/", parseFoodImage, create);
router.get("/", list);
router.get("/custom", custom);
router.get("/enabled", enabledList);
router.get("/favorites", favorites);
router.patch("/:id/favorite", favorite);
router.patch("/:id/enabled", enabled);
router.get("/:id", detail);
router.patch("/:id", parseFoodImage, update);
router.delete("/:id", remove);

export default router;
