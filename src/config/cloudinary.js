import cloudinaryModule from "cloudinary";
import "dotenv/config";

const cloudinary = cloudinaryModule.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export default cloudinary;
