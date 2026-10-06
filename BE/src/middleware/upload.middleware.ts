import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const uploadFoodImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("INVALID_IMAGE_TYPE"));
      return;
    }

    callback(null, true);
  },
}).single("image");

export function parseFoodImage(req: Request, res: Response, next: NextFunction) {
  uploadFoodImage(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ success: false, message: "Image must be 5 MB or smaller" });
      return;
    }

    if (error instanceof Error && error.message === "INVALID_IMAGE_TYPE") {
      res.status(400).json({ success: false, message: "Only JPEG, PNG, and WebP images are allowed" });
      return;
    }

    res.status(400).json({ success: false, message: "Invalid image upload" });
  });
}
