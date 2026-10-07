import { getCloudinary } from "../config/cloudinary.js";

export type UploadedImage = {
  secureUrl: string;
  publicId: string;
};

export async function uploadImage(buffer: Buffer, mimeType: string): Promise<UploadedImage> {
  if (!buffer.length) {
    throw new Error("IMAGE_REQUIRED");
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new Error("INVALID_IMAGE_TYPE");
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

    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  const cloudinary = getCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
