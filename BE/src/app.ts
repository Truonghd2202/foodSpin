import "./config/env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import foodRoutes from "./routes/food.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import spinRoutes from "./routes/spin.routes.js";

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === env.webOrigin) return callback(null, true);
    return callback(new Error("CORS_ORIGIN_REJECTED"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "FoodSpin API is running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/spins", spinRoutes);
app.use(errorHandler);

export default app;
