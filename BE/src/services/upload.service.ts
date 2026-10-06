import { getCloudinary } from "../config/cloudinary.js";

export type UploadedImage = {
  secureUrl: string;
  publicId?: string;
};

export async function uploadImage(file: Express.Multer.File): Promise<UploadedImage> {
  if (!file?.buffer) {
    throw new Error("IMAGE_REQUIRED");
  }

  const cloudinary = getCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "foodspin/foods", resource_type: "image" },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(new Error("IMAGE_UPLOAD_FAILED"));
          return;
        }

        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );

    stream.end(file.buffer);
  });
}
