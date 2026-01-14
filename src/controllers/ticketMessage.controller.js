import db from "../models/index.js";
import cloudinary from "../config/cloudinary.js";

export const sendMessage = async (req, res) => {
  try {
    console.log("Sending message")
    const { ticketId } = req.params;
    const { message } = req.body;
    const user = req.user;

    if (!message && !req.file) {
      return res.status(400).json({ message: "Message or image required" });
    }

    // // Only mechanic can send images
    // if (req.file && user.role !== "MECHANIC") {
    //   return res.status(403).json({ message: "Only mechanic can send images" });
    // }

    const imageUrl = req.file ? req.file.path : null;
    const messageType = message && imageUrl
      ? "MIXED"
      : message
      ? "TEXT"
      : "IMAGE";

    const newMessage = await db.TicketMessage.create({
      ticketId,
      senderId: user.id,
      senderRole: user.role,
      message: message || null,
      imageUrl,
      messageType,
    });

    return res.status(201).json(newMessage);
  } catch (err) {
    console.log("there is an error : ",err)
    return res.status(500).json({ message: "Failed to send message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const messages = await db.TicketMessage.findAll({
      where: { ticketId },
      order: [["createdAt", "ASC"]],
    });

    return res.json(messages);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};
