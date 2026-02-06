import db from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const sendMessage = asyncHandler(async (req, res) => {
  console.log("Sending message");
  const { ticketId } = req.params;
  const { message } = req.body;
  const user = req.user;

  if (!message && !req.file) {
    return res.status(400).json({ message: "Message or image required" });
  }

  const imageUrl = req.file ? req.file.path : null;
  const messageType =
    message && imageUrl ? "MIXED" : message ? "TEXT" : "IMAGE";

  const newMessage = await db.TicketMessage.create({
    ticketId,
    senderId: user.id,
    senderRole: user.role,
    message: message || null,
    imageUrl,
    messageType,
  });

  return res.status(201).json(newMessage);
});

export const getMessages = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;

  const messages = await db.TicketMessage.findAll({
    where: { ticketId },
    order: [["createdAt", "ASC"]],
  });

  return res.json(messages);
});
