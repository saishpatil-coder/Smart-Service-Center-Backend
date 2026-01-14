import express from "express";
import { verifyUser } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";
import { getMessages, sendMessage } from "../controllers/ticketMessage.controller.js";

const router = express.Router();

// Send message (text / image / both)
router.post(
  "/:ticketId/messages",
  verifyUser,
  upload.single("image"),
  sendMessage
);

// Get messages for a ticket
router.get("/:ticketId/messages", verifyUser, getMessages);

export default router;
