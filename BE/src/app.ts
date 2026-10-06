import "./config/env.js";
import express from "express";
import cors from "cors";

import prisma from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import foodRoutes from "./routes/food.routes.js";
import categoryRoutes from "./routes/category.routes.js";

const app = express();

app.use(cors());
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

app.get("/api/db-test", async (_req, res) => {
  try {
    const categories = await prisma.categories.findMany();

    res.json({
      success: true,
      database: "connected",
      categoryCount: categories.length,
      categories,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/categories", categoryRoutes);

export default app;
