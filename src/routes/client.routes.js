// src/routes/ticket.routes.js
import { verifyClient } from "../middleware/auth.middleware.js";
import { createTicket } from "../controllers/client.controller.js";
import { getAllServices } from "../controllers/service.controller.js";
import upload from "../middleware/upload.js";
import {Router} from "express";
import db from "../models/index.js";

const router = Router();
router.post(
  "/add-ticket",
  verifyClient,
  upload.single("image"),createTicket);

router.get("/tickets",verifyClient, async (req, res) => {
  console.log("getting tickets")
  try {
    const userId = req.user.id;
    const tickets = await db.Ticket.findAll({
      where: { clientId: userId },
      order: [["createdAt", "DESC"]],
    });
    res.json({ tickets });
  }catch (err) {
    console.log(err)
    res.status(511).json({"error" : "err"})
  }
}
)
router.get("/services" , getAllServices);
export default router;
