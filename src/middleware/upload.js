import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sscms_tickets",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

const upload = multer({ storage });

export default upload;
