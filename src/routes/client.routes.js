// src/routes/ticket.routes.js
import { Router } from "express";
import { getAllServices } from "../controllers/service.controller.js";
import { verifyClient } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";
import { createTicket, getClientTicketById, getTicketsByUser } from "../controllers/client.controller.js";
import { cancelTicket } from "../controllers/admin.controller.js";

const router = Router();
router.post(
  "/add-ticket",
  verifyClient,
  upload.single("image"),createTicket);

router.get("/tickets",verifyClient,getTicketsByUser )
router.get("/services" , getAllServices);
router.get("/getclient" , verifyClient ,);
router.get("/ticket/:id",verifyClient, getClientTicketById );
router.patch("/ticket/:id/cancel", verifyClient, cancelTicket);
export default router;
